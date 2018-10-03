var express = require('express');
var router = express.Router();
var userSchema = require('../models/user.model');
var Users = new userSchema();
var auth = require('./auth');
var posts = require('./posts');
var comments = require('./comments');
var albums = require('./albums');
var uploader = require('./uploader');
var follows = require('./follows');
var admins = require('./admins');
var users = require('./users');
var categories = require('./categories');
var hashtags = require('./hashtags');
var validateRequest = require('../middleWares/validateRequest');
var redis = require('redis');
var requestIp = require("request-ip");
const ipCountry = require('ip-country');
var redisClient = redis.createClient({

    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});

router.post('/login',auth.login);
router.post('/register', users.register);


router.get('/', function(req,res){

    res.render("main.html");

});
router.get('/login', function(req,res){
    validateRequest(req,res,function(callback){
        if(!callback.message) {
            res.render("main.html");
        }
        else {
            res.render("login.html");
        }
    });
});
router.get('/login/getKey', function(req,res){
    validateRequest(req,res,function(callback){
        if(callback.message) {
            users.generateAccessKey("login",req,res);
        }
        else{
            res.send({result:false,message:" You are already logged in "});
        }
    });
});

router.get('/register', function(req,res){
    validateRequest(req,res,function(callback){
        if(!callback.message) {
            res.render("main.html");
        }
        else {
            res.render("register.html");
        }
    });
});
router.get('/register/getKey', function(req,res){
    validateRequest(req,res,function(callback){
        if(callback.message) {
            users.generateAccessKey("register",req,res);
        }
        else{
            res.send({result:false,message:" You are already logged in "});
        }
    });
});
router.get('/admin', function(req,res){
    validateRequest(req,res,function(callback){
        if(!callback.message) {
            res.render("admin.html");
        }
        else {
            res.send("403 Forbidden");
        }
    });
});
router.get('/admin/getKey', function(req,res){
    validateRequest(req,res,function(callback){
        if(!callback.message) {
            users.generateAccessKey("admin",req,res,callback);
        }
        else{
            res.send({result:false,message:" You are already logged in "});
        }
    });
});
router.post('/admin/users/search',function(req,res){
    validateRequest(req,res,function(callback){
        if(!callback.message) {
            admins.decryptData(req,res,callback,function(decryptedData){
                if(!decryptedData.message){
                    let input = decryptedData;
                    admins.searchUsers(input,callback,function(usersList){
                        
                    }); // do update
                }
            });
            
        }
        else{
            res.send({result:false,message:" You are already logged in "});
        }
    });
});

router.post('/register/checkIsTaken', function(req,res){
    validateRequest(req,res,function(callback){
        if(callback.message) {
            let type = req.body.type || null;
            let text = req.body.text || null;
            if(type !==null && text !== null && typeof text ==="string" && typeof type ==="string" )
                users.checkValidationAndTaken(text,type,callback,function(resultx){
                    res.send(resultx);
                });
            else
                res.send({result:false,message:"504 Bad Request",status:504});

        }
        else{
            res.send({result:false,message:" Access Denied "});
        }
    });
});

router.get('/about', function(req,res){
    res.render("about.html");
});

router.get('/about/team', function(req,res){
    res.render("about.html");
});

router.get('/terms', function(req,res){
    validateRequest(req,res,function(callback){
        if(!callback.message) {
            res.redirect("/");
        }
        else {
            res.render("terms.html");
        }
    });
});
router.get('/users',function(req,res) {
    validateRequest(req,res,function(callback){
        if(callback.message) {
            res.redirect("/");
        }
        else {
            res.render("main.html");
        }
    });
});
router.get('/users/verifyEmail/:uuid/',function(req,res) {
    let emailKey = req.params.uuid.toString();
    validateRequest(req,res,function(callback){
        if(callback.message){
            callback.userId=null;
        }
        users.checkEmailVerification(callback.userId,emailKey,function(resultx){
            if(resultx.message){
                res.send(resultx); // show error verification page - 
            }
            else{
                if(callback.userId === null){
                    res.redirect("/login");
                }
                else{
                    res.redirect("/settings/emailVerifySuccess");
                }
            }
        });
    });
});
router.post('/api/v1/users/search/',function(req,res) {
    let text = req.body.text || undefined;
    if(text && (typeof text === "string") && (text.length > 3) && (text.length < 16)){
        let pageNumber = 1  
        if(req.body.pageNumber)
            pageNumber = parseInt(req.body.pageNumber) || 1;
        if(isNaN(pageNumber)){
            pageNumber = 1;
        }
        if(pageNumber < 11){
            validateRequest(req,res,function(callback){
                users.search(text,pageNumber,callback,function(usersList){
                    res.send(usersList);
                });
            });
        }
        else{
            res.send({result:false,message:"Thats Enough :)"})
        }
    }
});

router.get('/api/v1/admin/', function(req,res){
    validateRequest(req,res,function(callback){
        if(!callback.message) {
            if (callback.roles.indexOf("admin") > -1) {
                res.render('admin.html');
            }
            else {
                res.send(callback);
            }
        }
        else{
            res.send(callback);
        }
    });
});


router.get('/post/:uuid', function(req,res){

    validateRequest(req,res,function(callback){
        if(!callback.message) {
            res.render("post.html");    // html only static file preload some datas for authenticated
        }
        else{
            res.render("post.html");    // not authenticated
        }
    });

});




router.post('/api/v1/post/initial/', function(req,res){
    validateRequest(req,res,function(callback){
        if(!callback.message) {
            users.initialUpload(req,res,callback);
        }
        else{
            res.send(callback);
        }
    });
});
router.post('/api/v1/post/activate/', function(req,res){
    validateRequest(req,res,function(callback){
        if(!callback.message) {
            posts.activate(req,res,callback);
        }
        else{
            res.send(callback);
        }
    });
});

router.post('/api/v1/post/submit/', function(req,res){
    validateRequest(req,res,function(callback){
        if(!callback.message) {
            posts.activate(req,res,callback);
        }
        else{
            res.send(callback);
        }
    });
});
router.post('/api/v1/post/editPost/', function(req,res){
    validateRequest(req,res,function(callback){
        if(!callback.message) {
            posts.editPost(req,res,callback);
        }
        else{
            res.send(callback);
        }
    });
});


router.post('/api/v1/album/create/', function(req,res){
    validateRequest(req,res,function(callback){
        if(!callback.message) {
            albums.create(req,res,callback);
        }
        else{
            res.send(callback);
        }
    });
});
router.get('/api/v1/album/accessibles/', function(req,res){
    validateRequest(req,res,function(callback){
        if(!callback.message) {
            albums.getAccessibles(req,res,callback);
        }
        else{
            res.send(callback);
        }
    });
});
router.post('/api/v1/album/getUserAlbums/', function(req,res){
    validateRequest(req,res,function(callback){
        if(!callback.message) {
            albums.submitAlbum(req,res,callback);
        }
        else{
            res.send(callback);
        }
    });
});


router.post('/api/v1/post/:uuid', function(req,res){

    validateRequest(req,res,function(callback){
        if(!callback.message) {
            posts.getPostInfo(req, res, callback, req.params.uuid);    // html only static file preload some datas for authenticated
        }
        else{
            res.send(callback);
        }
    });

});

router.get('/:uuid', function(req,res){
    res.render("main.html");
});
router.get('/:uuid/latest', function(req,res){
    res.render("main.html");
});
router.get('/:uuid/curated', function(req,res){
    res.render("main.html");
});
router.get('/:uuid/top', function(req,res){
    res.render("main.html");
});
router.get('/:uuid/:uuid', function(req,res){
    res.render("main.html");
});


router.post('/api/v1/users/verifyPhone/',function(req,res) {
    let code = req.body.code || "";
    validateRequest(req,res,function(callback){
        if(!callback.message){
            if(code !== "" && code.length === 6){
                users.checkPhoneVerification(callback.userId,callback.phone.code+"/"+callback.phone.number,code,function(resultx){
                    res.send(resultx);
                });
            }
            else{
                res.send({result:false,message:"Invalid verification code"});
            }
        }
        else{
            res.send({result:false,message:"401 Not Authorized"});
        }
    });
});
router.post('/api/v1/users/resetPassword/',function(req,res) {
    validateRequest(req,res,function(user){
        let type = req.body.type || "email";
        let obj = {};
        if(!user.message){
            obj = {
                "old" : req.body["old"],
                "new" : req.body["new"],
                "confirmNew" : req.body["confirmNew"],
            };
            type = "change";
        }
        else{
            user.userId = null;
            obj = req.body.identification || ""; // email or phone number
        }

        users.resetPassword(user.userId,type,obj,function(result){
            res.send(result);
        });
        
    });
});
router.post('/api/v1/users/doResetPassword/',function(req,res) { // new and confirm password + userId verified by anyways in above
    users.checkPhoneVerification()
});
router.post('/api/v1/users/:uuid/followings',function(req,res) {
    let hostId = req.params.uuid.toString();
    validateRequest(req,res,function(user){
        if(!user.message) {
            redisClient.get(user.username + "::requestOrigin", function (err, requestOrigin) {
                if (err) throw err;

                let timeOrigin;
                let pageNumber = req.body.pageNumber || 1;
                let type = req.body.type || "user";
                let counts = req.body.counts || 10;
                let now = Date.now();
                if (requestOrigin) {
                    if (pageNumber === 1) {
                        redisClient.del(user.username + "::requestOrigin");
                        requestOrigin = now;
                        redisClient.set(user.username + "::requestOrigin", requestOrigin);
                        redisClient.expire(user.username + "::requestOrigin", 30000);
                    }
                    timeOrigin = requestOrigin;

                }
                else {
                    requestOrigin = now;
                    timeOrigin = requestOrigin;
                    redisClient.set(user.username + "::requestOrigin", requestOrigin);
                    redisClient.expire(user.username + "::requestOrigin", 30000);
                }
                follows.getFollowingsPaginated(req, res, user, hostId,type,timeOrigin, counts, pageNumber);
            });
        }
        else{
            res.send(user);
        }
    });
});


router.post('/api/v1/users/:uuid/followers',function(req,res) {
    let hostId = req.params.uuid.toString();
    validateRequest(req,res,function(user){
        if(!user.message) {
            redisClient.get(user.username + "::requestOrigin", function (err, requestOrigin) {
                if (err) throw err;

                let timeOrigin;
                let pageNumber = req.body.pageNumber || 1;
                let counts = req.body.counts || 10;
                let now = Date.now();
                if (requestOrigin) {
                    if (pageNumber === 1) {
                        redisClient.del(user.username + "::requestOrigin");
                        requestOrigin = now;
                        redisClient.set(user.username + "::requestOrigin", requestOrigin);
                        redisClient.expire(user.username + "::requestOrigin", 30000);
                    }
                    timeOrigin = requestOrigin;

                }
                else {
                    requestOrigin = now;
                    timeOrigin = requestOrigin;
                    redisClient.set(user.username + "::requestOrigin", requestOrigin);
                    redisClient.expire(user.username + "::requestOrigin", 30000);
                }
                follows.getFollowersPaginated(req, res, user, hostId,timeOrigin, counts, pageNumber);
            });
        }
        else{
            res.send(user);
        }
    });
});

router.post('/api/v1/users/disconnect',function(req,res) {
    validateRequest(req,res,function(callback){
        if(!callback.message) {
            users.disconnect(req, res, callback);
        }
        else{
            res.send(callback);
        }
    });
});


router.post('/api/v1/users/block',function(req,res) {
    validateRequest(req,res,function(callback){
        if(!callback.message) {
            users.block(req, res, callback);
        }
        else{
            res.send(callback);
        }
    });
});
router.post('/api/v1/users/unblock',function(req,res) {
    validateRequest(req,res,function(callback){
        if(!callback.message) {
            users.unblock(req, res, callback);
        }
        else{
            res.send({result:false,message:"Not Authenticated"});
        }
    });
});

router.get('/api/v1/users/getMe',function(req,res){
    validateRequest(req,res,function(callback){
        if(!callback.message) {
            users.getMe(req,res,callback);
       }
       else {
           res.send(callback);
       }
    });
});

router.post('/api/v1/users/getHostProfile',function(req,res){
    validateRequest(req,res,function(callback){
        if(!callback.message) {
            users.getHostProfile(req, res, callback)
        }
        else{
            res.send(callback);
        }
    });
});


router.get('/api/v1/users/getProfileInfo',function(req,res){
    validateRequest(req,res,function(callback){
        if(!callback.message) {
            users.getProfileInfo(req, res, callback);
        }
        else{
            res.send(callback);
        }
    });
});


router.post('/api/v1/users/updateProfileInfo',function(req,res){
    validateRequest(req,res,function(callback){
        if(!callback.message) {
            users.updateProfileInfo(req, res, callback);
        }
        else{
            res.send(callback);
        }
    });
});


router.post('/api/v1/users/follow',function(req,res){

    validateRequest(req,res,function(callback){
        if(!callback.message) {
            users.follow(req, res, callback);
        }
        else{
            res.send(callback);
        }
    });
});
router.post('/api/v1/users/unfollow',function(req,res){

    validateRequest(req,res,function(callback){
        if(!callback.message) {
            users.unfollow(req, res, callback);
        }
        else{
            res.send(callback);
        }
    });
});




router.post('/api/v1/upload/post',function(req,res){
    validateRequest(req,res,function(callback){
        if(!callback.message) {
            uploader.onUpload(req,res,"post",callback);
        }
        else {
            res.send(callback);
        }
    });
});
router.post('/api/v1/upload/profPics',function(req,res){
    validateRequest(req,res,function(callback){
        if(!callback.message) {
            uploader.onUpload(req,res,"profPics",callback);
        }
        else {
            res.send(callback);
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
        var userId = null;
        if(!user.message) {
            userId = user.userId;
        }
        else{
            userId = requestIp.getClientIp(req).toString();
        }
        redisClient.get("postRequestOrigin:"+userId, function (err, requestOrigin) {
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
            let pageNumber = parseInt(req.body.pageNumber) || 1;
            let counts = req.body.counts || 10;
            let isCurated = req.body.isCurated || undefined;
            let timeEdge = req.body.timeEdge || 1;
            if(isNaN(pageNumber)){
                res.send({result:false,message:"Bad Input"});
            }
            else{
                let orderBy = undefined;
                if(req.body.order==="latest")
                    orderBy = "createdAt";
                else if(req.body.order==="top") { 
                    orderBy = req.body.orderBy || "rate.value"; 
                }
                else if(req.body.order==="curated") {
                    orderBy = "updatedAt"; // ignore order by by now
                }
                else{
                    orderBy = "createdAt"
                }
                let now = Date.now();
                let curator = req.body.curator || undefined;
                if((requestOrigin === null) || (pageNumber===1)){ // no other choice
                    requestOrigin = now;
                    redisClient.set("postRequestOrigin:"+userId,requestOrigin);
                }  
                timeOrigin = parseInt(requestOrigin);
                redisClient.expire("postRequestOrigin:"+userId,60000); // 10mins
                posts.getPostsByFiltersAndOrders(req, res, user, "all", orderBy, isCurated, hashtags, category, curator ,false, true, false, 0,1000000,timeOrigin, timeEdge ,counts, pageNumber);  
            }
        });
    });
});

router.post('/api/v1/posts/subscriptions/',function(req,res){
    validateRequest(req,res,function(user) {
        if(!user.message) {
            redisClient.get("postRequestOrigin:"+user.userId, function (err, requestOrigin) {
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
                let now = Date.now();
                let curator = req.body.curator || undefined;
                if((requestOrigin === null) || (pageNumber===1)){ // no other choice
                    requestOrigin = now;
                    redisClient.set("postRequestOrigin:"+user.userId,requestOrigin);
                }  
                timeOrigin = parseInt(requestOrigin);

                redisClient.expire("postRequestOrigin:"+user.userId,60000); // 10mins
                user.followings.push(user.userId);
                posts.getPostsByFiltersAndOrders(req, res, user, user.followings, orderBy, isCurated, hashtags, category, curator ,false, true, true, 0,1000000,timeOrigin, timeEdge ,counts, pageNumber);
            });
        }
        else{
            res.send(user);
        }
    });
});


router.post('/api/v1/posts/:uuid',function(req,res){
    var hostUsername = req.params.uuid;
    users.getUserIdFromCache(hostUsername,function(hostUserId) {
        if(!hostUserId.message){
            users.getUserInfosFromCache(hostUserId,function(hostUser) {
                if(!hostUser.message){
                    if((typeof hostUsername === "string") && (hostUsername.length>3)){
                        validateRequest(req, res, function (user) {
                            let userId = null;
                            if(!user.message) {
                                userId = user.userId;
                            }
                            else{
                                userId = requestIp.getClientIp(req).toString();
                            }
                            let self = false;
                            let canQuery = true;
                            let privatePosts = false;
                            if(typeof hostUser.privacy === "string")
                                hostUser.privacy = JSON.parse(hostUser.privacy);
                            if (hostUser.privacy && userId !== hostUser.userId) {
                                canQuery = true;
                                if (user.followings.indexOf(userId) > -1) {
                                    privatePosts = true;     
                                }
                            }
                            else if (userId === hostUser.userId) {
                                privatePosts = true;
                                self = true;
                            }
                            else if(!hostUser.privacy){
                                privatePosts = true;
                                canQuery = true;
                                self = false;
                            }
                            else{

                            }
                            
                            let category = undefined;
                            if (req.body.category && req.body.category !== "") {
                                category = [req.body.category];
                            }
                            let timeOrigin;
                            let pageNumber = parseInt(req.body.pageNumber) || 1;
                            let counts = parseInt(req.body.counts) || 10;
                            let isCurated = req.body.isCurated || undefined;
                            let hashtags = [req.body.hashtags] || undefined;
                            let orderBy = req.body.orderBy || "createdAt";
                            let curator = req.body.curator || undefined;
                            let timeEdge = 0;
                            let now = Date.now();
                            redisClient.get("postRequestOrigin:"+userId, function (err, requestOrigin) {
                                if(err) throw err;
                                if((requestOrigin === null) || (pageNumber===1)){ // no other choice
                                    requestOrigin = now;
                                    redisClient.set("postRequestOrigin:"+userId,requestOrigin);
                                }  
                                timeOrigin = requestOrigin;
                                redisClient.expire("postRequestOrigin:"+userId,60000); // 10mins
                                
                                if (canQuery) {
                                    if (self) {
                                        timeEdge = 0;
                                    }
                                    posts.getPostsByFiltersAndOrders(req, res, user, [hostUser.userId], orderBy, isCurated, hashtags, category, curator, false, true, privatePosts, 0, 1000000, timeOrigin, timeEdge, counts, pageNumber);
                                }
                                else {
                                    res.send({result: false, message: "Content is private"});
                                }
                            });
                        });
                    }
                    else{
                        res.send({result:false,message:"504 Bad Request"});
                    }
                }
                else{
                    res.send(hostUser);
                }
            });
        }
        else{
            res.send(hostUserId);
        }
    });
});
        
// categories controllers

router.get('/api/v1/category/accessibles',function(req,res) {
    categories.getDefinedCategories(req,res);

});







// comment controllers

router.post('/api/v1/getPostComments/',function(req,res){

    if(!isNaN(parseInt(req.body.pageNumber)) && parseInt(req.body.pageNumber) > 0 && parseInt(req.body.pageNumber) < 100){
        //
    }
    else{
        req.body.pageNumber = 1;
    }
    if( req.body &&  typeof req.body.postId === "string" && !isNaN(parseInt(req.body.counts)) && parseInt(req.body.counts) < 20 ) { // max number
        validateRequest(req, res, function (user) {
            comments.getPostComments(req, res, user, req.body.postId, req.body.counts, req.body.pageNumber);
        });
    }
    else{
        res.send({result:false,message:"Bad Input"});
    }
});


router.post('/api/v1/users/addComment/',function(req,res){
    validateRequest(req,res,function(callback){
        if(callback){
            comments.create(req,res,callback);
        }
        else{
            res.send({result:false,message:"403 Unauthorized"})
        }
    });
});


router.post('/api/v1/users/editComment/',function(req,res){
    validateRequest(req,res,function(callback){
        if(callback){
            comments.edit(req,res,callback);
        }
        else{
            res.send({result:false,message:"403 Unauthorized"})
        }
    });
});

router.post('/api/v1/users/deleteComment/',function(req,res){
    validateRequest(req,res,function(callback){
        if(callback){
            comments.delete(req,res,callback);
        }
        else{
            res.send({result:false,message:"403 Unauthorized"})
        }
    });
});


// rate
router.post('/api/v1/users/rate',function(req,res){
    validateRequest(req,res,function(callback){
        if(callback) {
            posts.rate(req, res, callback);
        }
        else{
            res.send(null);
        }
    });
});
router.post('/api/v1/users/checkIsTaken', function(req,res){
    validateRequest(req,res,function(callback){
        if(!callback.message) {
            let type = req.body.type || "";
            let text = req.body.text || "";
            users.checkValidationAndTaken(text,type,callback,function(resultv){
                res.send(resultv);
            });
        }
        else{
            res.send(callback);
        }
    });
});
router.post('/api/v1/users/view',function(req,res){
    validateRequest(req,res,function(callback){
        if(callback) {
            posts.view(req, res, callback);
        }
        else{
            res.send(null);
        }
    });
});
router.delete('/api/v1/admin/user/:id', users.delete);
router.post('/api/v1/admin/posts/queue',function(req,res){

    validateRequest(req,res,function(user) {
        var userId = null;
        if(!user.message && user.roles && (user.roles.indexOf("admin") > -1)) {

            if(err) throw err;
            let pageNumber = parseInt(req.body.pageNumber) || 1;
            let counts = req.body.counts || 30;
            let isCurated = req.body.isCurated || undefined;
            let timeEdge = req.body.timeEdge || 1;
            if(isNaN(pageNumber)){
                res.send({result:false,message:"Bad Input"});
            }
            else{
                let orderBy = undefined;
                if(req.body.order==="latest")
                    orderBy = "createdAt";
                else if(req.body.order==="top") { 
                    orderBy = req.body.orderBy || "rate.value"; 
                }
                else if(req.body.order==="curated") {
                    orderBy = "updatedAt"; // ignore order by by now
                }
                else if(req.body.order==="reports") {
                    orderBy = "reportsCount"; // ignore order by by now
                }
                else if(req.body.order==="queue") {
                    orderBy = "queue"; // ignore order by by now
                }
                else{
                    orderBy = "createdAt"
                }
                let curator = req.body.curator || undefined; 
                posts.getPostsByFiltersAndOrders(req, res, user, "all", orderBy, isCurated, hashtags, category, curator ,true, true, true, 0,1000000,null, null ,counts, pageNumber);  
            }
        }
    });
});

router.post('/api/v1/admin/createCategory/', function(req,res){
    validateRequest(req,res,function(callback) {
        if(!callback.message) {
            categories.addNewCategory(req, res, callback);
        }
        else{
            res.send({result:false,message:"Unauthorized"});
        }
    });
});
router.post('/api/v1/admin/accept/post', function(req,res){
    validateRequest(req,res,function(callback) {
        if(!callback.message) {
            posts.accept(req, res, callback);
        }
        else{
            res.send({result:false,message:"Unauthorized"});
        }
    });
});
router.post('/api/v1/admin/reject/post', function(req,res){
    validateRequest(req,res,function(callback) {
        if(!callback.message) {
            posts.reject(req, res, callback);
        }
        else{
            res.send({result:false,message:"Unauthorized"});
        }
    });
});

module.exports = router;
