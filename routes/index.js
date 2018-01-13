var express = require('express');
var router = express.Router();
var userSchema = require('../models/user.model');
var users = new userSchema();
var auth = require('./auth');
var posts = require('./posts');
var uploader = require('./uploader');
var user = require('./users');

var validateRequest = require('../middleWares/validateRequest');
/*
 * Routes that can be accessed by any one
 */
router.get('/', function(req,res){
    validateRequest(req,res,function(callback){
        if(callback){
            res.render("main.html");
        }
        else {
            res.render("main.html");
        }
    });
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
    if(callback){
        res.redirect("/");
    }
    else {
        res.render("register.html");
    }
});

router.get('/api/v1/admin/users/', function(req,res){
    validateRequest(req,res,function(callback) {
        user.getAll(req, res, callback);
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

router.post('/api/v1/posts/new/', function(req,res){
    validateRequest(req,res,function(callback) {
        if(callback !==null) {
            posts.create(req, res, callback);
        }
        else{
            res.send("404 Not Found");
        }
    });
});


router.post('/api/v1/upload/new/', function(req,res){
    validateRequest(req,res,function(callback) {
        if(callback !==null) {
            uploader.onUpload(req,res,callback);
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