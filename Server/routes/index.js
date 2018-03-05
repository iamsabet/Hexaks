var express = require('express');
var router = express.Router();
var userSchema = require('../models/user.model');
var Users = new userSchema();
var auth = require('./auth');
var posts = require('./posts');
var comments = require('./comments');
var rates = require('./rates');
var views = require('./views');
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


router.get('/post/:uuid', function(req,res){
    validateRequest(req,res,function(callback){
        var hostPostId = req.params.uuid;
        if(callback) {
            res.render("post.html");                 // html only static file preload some datas for authenticated
        }
        else{
            var hostPostId = req.params.uuid;
            posts.isPrivate(hostPostId,function(callback){// html only static file preload some datas for not authenticated
                if(callback === true){

                }
                else{

                }
            });
        }
    });
});



router.get('/:uuid', function(req,res){
    var hostUserName = req.params.uuid;
    res.render("main.html");

});


router.get('/:uuid/:uuid2', function(req,res){
    var uuid = req.params.uuid2;
    console.log(uuid);
    res.render("main.html");

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


















// POST Routes
router.post('/api/v1/posts/home/',function(req,res){
    //
    res.send(true);
});

router.post('/api/v1/posts/explore/',function(req,res){

    validateRequest(req,res,function(user) {
        let username;
        if(user !==null) {
            username = user.username;
        }
        else{
            username = requestIp.getClientIp(req).toString();
        }

        let now = Date.now();
        redisClient.get(username+"::postRequestOrigin", function (err, requestOrigin) {
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
            let isCurated = req.body.isCurated || undefined;
            let timeEdge = req.body.timeEdge || 1;
            let orderBy = undefined;
            if(req.body.order==="latest")
                orderBy = "createdAt";
            else if(req.body.order==="top") { // curated only
                orderBy = req.body.orderBy || "rate.value";
            }

            let curator = req.body.curator || undefined;
            if(pageNumber === 1){
                if(requestOrigin){

                    requestOrigin = now;
                    redisClient.set(username+"::postRequestOrigin",requestOrigin);
                    redisClient.expire(username+"::postRequestOrigin",30000);
                }
                timeOrigin = requestOrigin;
            }
            else{
                requestOrigin = now;
                timeOrigin = requestOrigin;
                redisClient.set(username+"::postRequestOrigin",requestOrigin);
                redisClient.expire(username+"::postRequestOrigin",30000);
            }
            posts.getPostsByFiltersAndOrders(req, res, user, "all", orderBy, isCurated, hashtags, category, curator ,false, true, false, 0,1000000,timeOrigin, timeEdge ,counts, pageNumber);

        });
    });
});



router.post('/api/v1/posts/subscriptions/',function(req,res){

    validateRequest(req,res,function(user) {
        if(user) {
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
                }

                let curator = req.body.curator || undefined;
                if(requestOrigin){
                    if(pageNumber === 1){
                        requestOrigin = Date.now();
                        redisClient.del(user.username+"::requestOrigin",function(index){
                            console.log(index);
                        });
                        redisClient.set(user.username+"::requestOrigin",requestOrigin);
                        redisClient.expire(user.username+"::requestOrigin",30000);
                    }
                    timeOrigin = requestOrigin;
                }
                else{
                    requestOrigin = Date.now();
                    timeOrigin = requestOrigin;
                    redisClient.set(user.username+"::requestOrigin",requestOrigin);
                    redisClient.expire(user.username+"::requestOrigin",30000);
                }
                posts.getPostsByFiltersAndOrders(req, res, user, user.followings, orderBy, isCurated, hashtags, category, curator ,false, true, true, 0,1000000,timeOrigin, timeEdge ,counts, pageNumber);

            });
        }
        else{
            res.send({result:false,message:"Login Or Register to Continue"});
        }
    });
});



router.post('/api/v1/posts/:uuid',function(req,res){
    userSchema.findOne({username:req.params.uuid},{isPrivate:1},function(err,hostUser){
        if(err) throw err;
        if(hostUser) {
            validateRequest(req, res, function (user) {
                if (user) {
                    var self = false;
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
                    if(user.username === req.params.uuid){
                        privatePosts = true;
                        self = true;
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
                        let isCurated = req.body.isCurated || undefined;
                        let hashtags = [req.body.hashtags] || undefined;
                        let orderBy = req.body.orderBy || "createdAt";
                        let curator = req.body.curator || undefined;
                        let timeEdge = 0;
                        let now = Date.now();
                        if (requestOrigin) {
                            if (pageNumber === 1) {
                                redisClient.del(user.username+"::requestOrigin");
                                requestOrigin = now;
                                redisClient.set(user.username+"::requestOrigin", requestOrigin);
                                redisClient.expire(user.username+"::requestOrigin",30000);
                            }
                            timeOrigin = requestOrigin;

                        }
                        else {
                            requestOrigin = now;
                            timeOrigin = requestOrigin;
                            redisClient.set(user.username+"::requestOrigin", requestOrigin);
                            redisClient.expire(user.username+"::requestOrigin",30000);
                        }
                        if(canQuery) {
                            if(self){
                                timeEdge = 0;
                            }
                            posts.getPostsByFiltersAndOrders(req, res, user, [req.params.uuid], orderBy, isCurated, hashtags, category, curator ,false, true, privatePosts, 0,1000000,timeOrigin, timeEdge ,counts, pageNumber);
                        }
                        else{
                            res.send({result:false,message:"403 - Forbidden Account is Private"});
                        }
                    });
                }
                else {
                    if(!hostUser.isPrivate) {
                        redisClient.get(requestIp.getClientIp(req), function (err, requestOrigin) {
                            if (err) throw err;
                            let category = undefined;
                            if (req.body.category && req.body.category !== "") {
                                category = [req.body.category];
                            }
                            let timeOrigin;
                            let pageNumber = req.body.pageNumber || 1;
                            let counts = req.body.counts || 10;
                            let isCurated = req.body.isCurated || false;
                            let hashtags = [req.body.hashtags] || undefined;
                            let orderBy = req.body.orderBy || "createdAt";
                            let curator = req.body.curator || undefined;
                            let timeEdge = 0;
                            let now = Date.now();
                            if (requestOrigin) {
                                if (pageNumber === 1) {
                                    redisClient.del(requestIp.getClientIp(req)+ "::requestOrigin");
                                    requestOrigin = now;
                                    redisClient.set(requestIp.getClientIp(req) + "::requestOrigin", requestOrigin);
                                    redisClient.expire(requestIp.getClientIp(req)+ "::requestOrigin", 30000);
                                }
                                timeOrigin = requestOrigin;

                            }
                            else {
                                requestOrigin = now;
                                timeOrigin = requestOrigin;
                                redisClient.set(requestIp.getClientIp(req)+ "::requestOrigin", requestOrigin);
                                redisClient.expire(requestIp.getClientIp(req) + "::requestOrigin", 30000);
                            }

                            posts.getPostsByFiltersAndOrders(req, res, user, [req.params.uuid], orderBy, isCurated, hashtags, category, curator, false, true, false, 0, 1000000, timeOrigin, timeEdge, counts, pageNumber);

                        });
                    }
                    else{
                        res.send({result:false,message:"Account is Private - login and follow "});
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
router.post('/api/v1/post/editPost/', function(req,res){
    validateRequest(req,res,function(callback) {
        if(callback !==null) {
            posts.editPost(req,res,callback);
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







// comment controllers

router.post('/api/v1/getComments/',function(req,res){

    if( req.body &&  typeof req.body.postId === "string") {
        validateRequest(req, res, function (user) {
            var username;
            if (user) {
                username = user.username
            }
            else {
                username = requestIp.getClientIp(req).toString();
            }

            var now = Date.now();
            redisClient.get(username + "::cmRequestOrigin", function (err, requestOrigin) {
                if (err) throw err;
                let timeOrigin;
                let pageNumber = req.body.pageNumber || 1;
                let counts = req.body.counts || 10;
                let postId = req.body.postId;
                if (pageNumber === 1) {
                    if (requestOrigin) {

                        requestOrigin = now;
                        redisClient.set(username + "::cmRequestOrigin", requestOrigin);
                        redisClient.expire(username + "::cmRequestOrigin", 30000);
                    }
                    timeOrigin = requestOrigin;
                }
                else {
                    requestOrigin = now;
                    timeOrigin = requestOrigin;
                    redisClient.set(username + "::cmRequestOrigin", requestOrigin);
                    redisClient.expire(username + "::cmRequestOrigin", 30000);
                }
                comments.getPostComments(req, res, user, timeOrigin, postId, counts, pageNumber);
            });

        });
    }
    else{
        res.send({result:false,message:"Bad Input"});
    }
});





router.delete('/api/v1/admin/user/:id', users.delete);



module.exports = router;