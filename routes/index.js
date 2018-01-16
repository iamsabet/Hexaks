var express = require('express');
var router = express.Router();
var userSchema = require('../models/user.model');
var users = new userSchema();
var auth = require('./auth');
var posts = require('./posts');
var albums = require('./albums');
var uploader = require('./uploader');
var user = require('./users');

var validateRequest = require('../middleWares/validateRequest');
/*
 * Routes that can be accessed by any one
 */
router.get('/', function(req,res){

    res.render("main.html");

});
router.get('/login', function(req,res){
    validateRequest(req,res,function (callback) {

    if(callback){
        res.redirect("/");
    }
    else {
        res.render("login.html");
        }
    });
});

router.get('/register', function(req,res){
    validateRequest(req,res,function (callback) {
        if (callback) {
            res.redirect("/");
        }
        else {
            res.render("register.html");
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







router.get('/api/v1/users/getMe',function(req,res){
    validateRequest(req,res,function(callback){
       if(callback){
            user.getMe(req,res,callback)
       }
       else {
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
router.delete('/api/v1/admin/user/:id', user.delete);


router.post('/login', auth.login);
router.post('/register', user.register);
/*
 * Routes that can be accessed only by autheticated users
 */


module.exports = router;