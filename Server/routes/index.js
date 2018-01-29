var express = require('express');
var router = express.Router();
var userSchema = require('../models/user.model');
var Users = new userSchema();
var auth = require('./auth');
var posts = require('./posts');
var albums = require('./albums');
var uploader = require('./uploader');
var users = require('./users');
var url = require("url");
var validateRequest = require('../middleWares/validateRequest');
var redisNode = require('redis-node');
var redis = redisNode.createClient();    // Create the client
redis.select(2);

/*

 * Routes that can be accessed by any one
 */

router.get('/', function(req,res){

    res.render("main.html");

});
router.get('/login', function(req,res){
    validateRequest(req,res,function (callback) {

    if(callback){
        res.render("main.html");
    }
    else {
        res.render("login.html");
        }
    });
});

router.get('/register', function(req,res){
    validateRequest(req,res,function (callback) {
        if (callback) {
            res.render("main.html");
        }
        else {
            res.render("register.html");
        }
    });
});

router.get('/about', function(req,res){
    validateRequest(req,res,function (callback) {
        if (callback) {
            res.redirect("/");
        }
        else {
            res.render("about.html");
        }
    });
});
router.get('/terms', function(req,res){
    validateRequest(req,res,function (callback) {
        if (callback) {
            res.redirect("/");
        }
        else {
            res.render("terms.html");
        }
    });
});

router.get('/api/v1/admin/', function(req,res){
    validateRequest(req,res,function(callback) {
        if(callback.roles.indexOf("admin") > -1) {
            res.render('admin.html');
        }
        else{
            res.send("404 - Not Found");
        }
    });
});



router.get('/:uuid', function(req,res){
    var hostUserName = req.params.uuid;
    res.render("main.html");

});



router.get('/posts/:uuid', function(req,res){
    var hostPostId = req.params.uuid;
    res.render("slideView.html");

});


router.get('/api/v1/users/getMe',function(req,res){
    validateRequest(req,res,function(callback){
       if(callback){
            users.getMe(req,res,callback)
       }
       else {
           res.send(null);
       }
    });
});

router.post('/api/v1/users/getHostProfile',function(req,res){

    validateRequest(req,res,function(callback){
        users.getHostProfile(req,res,callback)
    });
});


router.get('/api/v1/users/getProfileInfo',function(req,res){

    validateRequest(req,res,function(callback){
        if(callback) {
            users.getProfileInfo(req, res, callback);
        }
        else{
            res.send(null);
        }
    });
});


router.post('/api/v1/users/updateProfileInfo',function(req,res){

    validateRequest(req,res,function(callback){
        if(callback) {
            users.updateProfileInfo(req, res, callback)
        }
        else{
            res.send(null);
        }
    });
});

router.post('/api/v1/users/follow',function(req,res){

    validateRequest(req,res,function(callback){
        if(callback) {
            users.follow(req, res, callback)
        }
        else{
            res.send(null);
        }
    });
});
router.post('/api/v1/users/unfollow',function(req,res){

    validateRequest(req,res,function(callback){
        if(callback) {
            users.unfollow(req, res, callback)
        }
        else{
            res.send(null);
        }
    });
});




router.post('/api/v1/upload',function(req,res){
    validateRequest(req,res,function(callback){
        if(callback){
            uploader.onUpload(req,res,callback)
        }
        else {
            res.send(null);
        }
    });
});











router.post('/api/v1/post/initial/', function(req,res){
    validateRequest(req,res,function(callback) {
        if(callback !==null) {
            users.initialUpload(req,res,callback);
        }
        else{
            res.send("404 Not Found");
        }
    });
});
router.post('/api/v1/post/activate/', function(req,res){
    validateRequest(req,res,function(callback) {
        if(callback !==null) {
            posts.activate(req,res,callback);
        }
        else{
            res.send("404 Not Found");
        }
    });
});
router.post('/api/v1/post/clear/', function(req,res){
    validateRequest(req,res,function(callback) {
        if(callback !==null) {
            users.removeUploading(req,res,callback);
        }
        else{
            res.send("404 Not Found");
        }
    });
});

router.post('/api/v1/post/clear/', function(req,res){
    validateRequest(req,res,function(callback) {
        if(callback !==null) {
            users.removeUploading(req,res,callback);
        }
        else{
            res.send("404 Not Found");
        }
    });
});



router.get('/api/v1/posts/subscriptions/',async function(req,res){

    validateRequest(req,res,function(user) {
        if(user !==null) {
            redis.get("requestOrigin:"+user.username, function (err, requestOrigin) {
                if(err) throw err;
                let timeOrigin ;
                if(requestOrigin){
                    timeOrigin = requestOrigin;
                }
                else{
                    requestOrigin = Date.now().getTime();
                    redis.set("requestOrigin:"+user.username,requestOrigin);
                }
                let pageNumber = req.query.pageNumber;
                let counts = req.query.counts;
                let isCurated = req.query.isCurated;
                let hashtags = [req.query.hashtag];
                let orderBy = req.query.orderBy;
                let category = req.query.category;
                posts.getPostsByFiltersAndOrders(req,res,user,user.followings,orderBy,isCurated,hashtags,category,false,true,false,timeOrigin,counts,pageNumber,function(posts){
                    if(err) throw err;
                    res.send(posts);
                });
            });
        }
        else{
            res.send("404 Not Found");
        }
    });
});













router.post('/api/v1/album/initial/', function(req,res){
    validateRequest(req,res,function(callback) {
        if(callback !==null) {
            albums.addNewPost(req,res,callback);
        }
        else{
            res.send("404 Not Found");
        }
    });
});
router.post('/api/v1/album/new/', function(req,res){
    validateRequest(req,res,function(callback) {
        if(callback !==null) {
            posts.addNewPost(req,res,callback);
        }
        else{
            res.send("404 Not Found");
        }
    });
});

router.delete('/api/v1/admin/user/:id', users.delete);


router.post('/login', auth.login);
router.post('/register', users.register);
/*
 * Routes that can be accessed only by autheticated users
 */


module.exports = router;