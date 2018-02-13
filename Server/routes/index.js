var express = require('express');
var router = express.Router();
var userSchema = require('../models/user.model');
var Users = new userSchema();
var auth = require('./auth');
var posts = require('./posts');
var albums = require('./albums');
var uploader = require('./uploader');
var users = require('./users');
var validateRequest = require('../middleWares/validateRequest');
var redis = require('redis');
var requestIp = require("request-ip");
var redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});

router.post('/login', auth.login);
router.post('/register', users.register);


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




router.post('/api/v1/posts/subscriptions/',function(req,res){

    validateRequest(req,res,function(user) {
        if(user !==null) {
            redisClient.get(user.username+"::requestOrigin", function (err, requestOrigin) {
                if(err) throw err;
                let category = undefined;
                if(req.body.category && req.body.category !==""){
                    category = [req.body.category];
                }
                let hashtags = undefined;
                if(req.body.hashtag && req.body.hashtag !==""){
                    hashtags = [req.body.hashtag];
                }
                let timeOrigin;
                let pageNumber = req.body.pageNumber || 1;
                let counts = req.body.counts || 10;
                let isCurated = req.body.isCurated || false;
                let timeEdge = req.body.timeEdge || 1;
                let orderBy = undefined;
                if(req.body.order==="latest")
                    orderBy = "createdAt";
                else if(req.body.order==="top") {
                    orderBy = req.body.orderBy || "rate.value";
                    isCurated = true;
                }

                let curator = req.body.curator || undefined;
                if(requestOrigin){
                    timeOrigin = requestOrigin;
                    if(pageNumber === 1){
                        requestOrigin = Date.now();
                        redisClient.set("requestOrigin:"+user.username,requestOrigin);
                    }
                }
                else{
                    requestOrigin = Date.now();
                    timeOrigin = requestOrigin;
                    redisClient.set("requestOrigin:"+user.username,requestOrigin);
                }
                posts.getPostsByFiltersAndOrders(req, res, user, user.followings, orderBy, isCurated, hashtags, category, curator ,false, true, true, 0,1000000,timeOrigin, timeEdge ,counts, pageNumber);

            });
        }
        else{
            res.send({result:false,message:"404 Not Found"});
        }
    });
});



router.post('/api/v1/posts/:uuid',function(req,res){
    userSchema.findOne({username:req.params.uuid},{isPrivate:1},function(err,hostUser){
        if(err) throw err;
        if(hostUser) {
            validateRequest(req, res, function (user) {
                if (user) {
                    let canQuery = true;
                    let privatePosts = false;
                    if(hostUser.isPrivate && user.username !== req.params.uuid){
                        if(user.followings.indexOf(req.param.uuid) > -1){
                            privatePosts=true;
                            canQuery = true;
                        }
                        else{
                            canQuery = false;
                        }
                    }
                    if(user.username !== req.params.uuid){
                        privatePosts = true;
                    }
                    redisClient.get(user.username + "::requestOrigin", function (err, requestOrigin) {
                        if (err) throw err;
                        let category = undefined;
                        if(req.body.category && req.body.category !==""){
                            category = [req.body.category];
                        }
                        let timeOrigin;
                        let pageNumber = req.body.pageNumber || 1;
                        let counts = req.body.counts || 10;
                        let isCurated = req.body.isCurated || false;
                        let hashtags = [req.body.hashtags] || undefined;
                        let orderBy = req.body.orderBy || "createdAt";
                        let curator = req.body.curator || undefined;
                        if (requestOrigin) {
                            timeOrigin = requestOrigin;
                            if (pageNumber === 1) {
                                requestOrigin = Date.now();
                                redisClient.set(user.username + "::requestOrigin", requestOrigin);
                            }
                        }
                        else {
                            requestOrigin = Date.now();
                            timeOrigin = requestOrigin;
                            redisClient.set(user.username + "::requestOrigin", requestOrigin);
                        }
                        if(canQuery) {
                            posts.getPostsByFiltersAndOrders(req, res, user, [req.params.uuid], orderBy, isCurated, hashtags, category, curator ,false, true, privatePosts, 0,1000000,timeOrigin, 1 ,counts, pageNumber);
                        }
                        else{
                            res.send({result:false,message:"403 - Forbidden Account is Private"});
                        }
                    });
                }
                else {
                    if(!hostUser.isPrivate) {
                        redisClient.get(requestIp.getClientIp(req) + "::requestOrigin", function (err, requestOrigin) {

                            let timeOrigin;
                            let pageNumber = req.query.pageNumber;
                            let counts = req.query.counts;
                            let isCurated = req.query.isCurated;
                            let hashtags = [];
                            let orderBy = req.query.orderBy;
                            let category = [];
                            if (requestOrigin) {
                                timeOrigin = requestOrigin;
                                if (pageNumber === 1) {
                                    requestOrigin = Date.now();
                                    redisClient.set(requestIp.getClientIp(req) + "::requestOrigin", requestOrigin);
                                    redisClient.expire()
                                }
                            }
                            else {
                                requestOrigin = Date.now();
                                redisClient.set(requestIp.getClientIp(req) + "::requestOrigin", requestOrigin);
                            }
                            posts.getPostsByFiltersAndOrders(req, res, user, user, orderBy, isCurated, hashtags, category, false, true, false, timeOrigin, counts, pageNumber, function (posts) {
                                if (err) throw err;
                                console.log(posts);
                                res.send(posts);
                            });
                        });
                    }
                    else{
                        res.send({result:false,message:"403 - Forbidden Account is Private"});
                    }
                }
            });
        }
        else{
            res.send("404 Not Found user");
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

router.post('/api/v1/post/submit/', function(req,res){
    validateRequest(req,res,function(callback) {
        if(callback !==null) {
            posts.activate(req,res,callback);
        }
        else{
            res.send("404 Not Found");
        }
    });
});
router.post('/api/v1/post/initial/', function(req,res){
    validateRequest(req,res,function(user) {
        if(user) {
            console.log("user"+user);
            users.initialUpload(req,res,user);
        }
        else{
            res.send({result:false,message:"404 Not Found"});
        }
    });
});
router.post('/api/v1/album/initial/', function(req,res){
    validateRequest(req,res,function(callback) {
        if(callback !==null) {
            users.initialUpload(req,res,callback);
        }
        else{
            res.send({result:false,message:"404 Not Found"});
        }
    });
});

router.post('/api/v1/album/submit/', function(req,res){
    validateRequest(req,res,function(callback) {
        if(callback !==null) {
            albums.submitAlbum(req,res,callback);
        }
        else{
            res.send("404 Not Found");
        }
    });
});
router.delete('/api/v1/admin/user/:id', users.delete);



/*
 * Routes that can be accessed only by autheticated users
 */


module.exports = router;