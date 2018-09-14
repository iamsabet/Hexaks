const mongoose = require('mongoose');
var postSchema = require('../models/post.model');
var post = new postSchema();
var userSchema = require('../models/user.model');
var User = new userSchema();
var followSchema = require('../models/follow.model');
var follow = new followSchema();
var rateSchema = require('../models/rate.model');
var rate = new rateSchema();
var commentSchema = require('../models/comment.model');
var Comment = new commentSchema();
var bcrypt = require("bcrypt-nodejs");
var users = require('./users');
var posts = require('./posts');
var blocks = require('./blocks');
var redis = require("redis");
var random = require('randomstring');
var requestIp = require("request-ip");
var redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});

var comments = {

    getPostComments: function (req, res, user, postId, counts, pageNumber) {

        let userId = null;
        if(!user.message) {
            userId = user.userId;
        }
        else{
            userId = requestIp.getClientIp(req).toString();
        }
        redisClient.get("commentRequestOrigin:"+userId, function (err, requestOrigin) {
            if(err) throw err;
            if(requestOrigin)
            var postOwnerId = posts.getPostOwnerIdByDecrypt(postId);
            let query = {
                postId: postId,
                deactive: false,
                deleted:false,
                ownerId:{$exists:true}
            };
            if (req.body.self) {
                query.ownerId = user.userId;
            }
            if(isNaN(parseInt(pageNumber))){
                res.send({result:false,message:"Bad Input"});
            }
            else{
                let options = {
                    select: 'commentId postId postOwnerId ownerId mentions hashtags fullText activated deleted createdAt edited updatedAt',
                    sort: {createdAt: -1},
                    page: parseInt(pageNumber),
                    limit: parseInt(counts)
                };
                let now = Date.now();
                let curator = req.body.curator || undefined;
                

                if((requestOrigin === null) || (parseInt(pageNumber)===1)){ // no other choice
                    requestOrigin = now;
                    redisClient.set("commentRequestOrigin:"+userId,requestOrigin);
                }  
                timeOrigin = requestOrigin;
                redisClient.expire("commentRequestOrigin:"+userId,60000); // 10mins

                let timeEdge = 0;
                if (timeEdge <= (31 * 24) && timeEdge > -1) {
                    if (timeEdge !== 0) {
                        timeEdge = (timeOrigin - (timeEdge * 3600 * 1000));
                        query.createdAt = {$gte: timeEdge, $lt: timeOrigin} // time edge up to 31 days
                    }
                }
                else {
                    timeEdge = (timeOrigin - (744 * 3600 * 1000)); // 1day
                    query.createdAt = {$gte: timeEdge, $lt: timeOrigin} // time edge up to 31 days
                }
                users.getUserInfosFromCache(postOwnerId,function(hostUser){
                    if(hostUser && !hostUser.message){
                        if(JSON.parse(hostUser.privacy)){
                            if(user && !user.message){
                                if(user.followings.indexOf(hostUser.userId) > -1){
                                    Comment.Paginate(query, options,user,req, res);
                                }
                                else{
                                    blocks.check(postOwnerId,user.userId,function(resultb){
                                        if(!resultb){
                                            posts.getPostInfoById(postId,false,function(post){
                                                if (post) {
                                                    Comment.Paginate(query, options,user, req, res);
                                                }     
                                                else{
                                                    res.send({result:false,message:"Content is private - Follow to continue"});
                                                }         
                                            });
                                        }
                                        else{
                                            res.send({result:false,message:"You have been blocked by the post owner"});
                                        }
                                    });
                                }
                            }
                            else{ // not authenticated && private
                                    res.send({result:false,message:"Account is private login and follow to continue"});
                            }
                        }
                        else{ //public account
                                Comment.Paginate(query, options,user, req, res);
                        }
                    }
                });
            }
        });
    },

    Create: function (req, res, user) {

        let postId = req.body.postId;
        if (postId && typeof postId === "string" && req.body && typeof req.body.text === "string") {
            let ownerId  = posts.getPostOwnerIdByDecrypt(postId);
            let text = req.body.text;
            if (user) {
                postSchema.findOne({postId: postId, ownerId: postOwnerId}, {
                    privacy: 1,
                    ownerId: 1,
                    postId: 1
                }, function (err, post) {
                    if (err) res.send({result: false, message: "500 post found for comments"});
                    if (post) {


                        let reHashtag = /(?:^|[ ])#([a-zA-Z]+)/gm;
                        let reMention = /(?:^|[ ])@([a-zA-Z]+)/gm;
                        let str = text;
                        let m;
                        let hashtags = [];
                        let mentions = [];
                        redisClient.hgetall(postOwnerId + ":info", function (err, info) {
                            if (err) throw err;
                            if (info) {
                                let blockList=[];
                                if(info.blockList !== "") {
                                    blockList = JSON.parse(info.blockList);
                                }
                                if (blockList.indexOf(user.userId) === -1) {
                                    if (user.blockList.indexOf(postOwnerId) === -1) {
                                        while ((m = reHashtag.exec(str)) != null) {
                                            if (m.index === reHashtag.lastIndex) {
                                                reHashtag.lastIndex++;
                                            }
                                            if (hashtags.indexOf(m[0]) === -1) {
                                                hashtags.push(m[0]);
                                            }
                                        }
                                        let n;
                                        while ((n = reMention.exec(str)) != null) {
                                            if (n.index === reMention.lastIndex) {
                                                reMention.lastIndex++;
                                            }
                                            if (mentions.indexOf(n[0]) === -1) {
                                                mentions.push(n[0]);
                                            }
                                        }
                                        let commentObject = {
                                            postId: postId,
                                            postOwnerId: postOwnerId,
                                            ownerId: ownerId,
                                            activated: false,
                                            deleted: false,
                                            mentions: mentions, // usernames @
                                            hashtags: hashtags, // #
                                            fullText: text,

                                        };
                                        if (!JSON.parse(info.privacy)) {
                                            if (postId && postOwnerId && ownerId) {
                                                Comment.create(commentObject, function (callback) {
                                                    if (callback) {
                                                        res.send(callback);
                                                    }
                                                    else {
                                                        res.send({result: false, message: "create comment failed"});
                                                    }
                                                });
                                            }
                                            else {
                                                return callback({result: false, message: "504 Bad request"});
                                            }
                                        }
                                        else {
                                            if (user.followings.indexOf(postOwnerId) > -1) {
                                                Comment.create(commentObject, function (callback) {
                                                    if (callback) {
                                                        res.send(callback);
                                                    }
                                                    else {
                                                        res.send({result: false, message: "create comment failed"});
                                                    }
                                                });
                                            }
                                            else {
                                                res.send({result: false, message: "Unauthorized"});
                                            }
                                        }
                                    }
                                    else {
                                        res.send({result: false, message: "you have blocked the post owner "}); // redis
                                    }
                                }
                                else {
                                    res.send({result: false, message: "you have been blocked by the post owner"}); // redis
                                }
                            }
                            else {
                                res.send({result: false, message: "user info not found in cache"}); // redis
                            }
                        });
                    }
                    else {
                        res.send({result: false, message: "post not found"});
                    }
                });
            }
            else {
                res.send({result: false, message: "Not Authenticated"});
            }
        }
        else {
            res.send({result: false, message: "504 Bad Request"});
        }
    },
    edit: function (req, res, user) {

        if (user) {
            let ownerId = user.userId;
            let postId = req.body.postId;
            let commentId = req.body.commentId;
            if (ownerId && typeof ownerId === "string" && commentId && typeof commentId === "string") {

                let postOwnerId = req.body.postId.split("|-p-|")[0];
                let text = req.body.text;
                if (user) {
                    postSchema.findOne({postId: postId, ownerId: postOwnerId}, {
                        privacy: 1,
                        ownerId: 1,
                        postId: 1
                    }, function (err, post) {
                        if (err) res.send({result: false, message: "500 post found for comments"});
                        if (post) {


                            let reHashtag = /(?:^|[ ])#([a-zA-Z]+)/gm;
                            let reMention = /(?:^|[ ])@([a-zA-Z]+)/gm;
                            let str = text;
                            let m;
                            let hashtags = [];
                            let mentions = [];
                            redisClient.hgetall(postOwnerId + ":info", function (err, info) {
                                if (err) throw err;
                                if (info) {
                                    let blockList ="";
                                    if(info.blockList !== "") {
                                        blockList = JSON.parse(info.blockList);
                                    }
                                    if (blockList.indexOf(user.userId) === -1 || blockList==="") {
                                        if (user.blockList.indexOf(postOwnerId) === -1) {
                                            while ((m = reHashtag.exec(str)) != null) {
                                                if (m.index === reHashtag.lastIndex) {
                                                    reHashtag.lastIndex++;
                                                }
                                                if (hashtags.indexOf(m[0]) === -1) {
                                                    hashtags.push(m[0]);
                                                }
                                            }
                                            let n;
                                            while ((n = reMention.exec(str)) != null) {
                                                if (m.index === reMention.lastIndex) {
                                                    reMention.lastIndex++;
                                                }
                                                if (hashtags.indexOf(n[0]) === -1) {
                                                    mentions.push(n[0]);
                                                }
                                            }
                                            let query = {
                                                postId: postId,
                                                ownerId: ownerId,
                                                commentId: commentId,
                                                postOwnerId : postOwnerId,
                                                deactive: false,
                                                deleted: false,
                                            };
                                            let updates = {
                                                mentions: mentions, // usernames @
                                                hashtags: hashtags, // #
                                                fullText: text,
                                                updatedAt: Date.now(),
                                                edited:true
                                            };
                                            if (!JSON.parse(info.privacy)) {
                                                if (postId && postOwnerId && ownerId) {
                                                    commentSchema.findOneAndUpdate(query,{$set:updates}, function (err, result) {
                                                        if (err) throw err;
                                                        if (result) {
                                                            res.send(true);
                                                        }
                                                        else {
                                                            res.send({result: false, message: "edit comment failed"});
                                                        }
                                                    });
                                                }
                                                else {
                                                    res.send({result: false, message: "No posts uploaded yet"});
                                                }
                                            }
                                            else {
                                                if (user.followings.indexOf(postOwnerId) > -1) {
                                                    commentSchema.findOneAndUpdate(query,{$set:updates}, function (err, result) {
                                                        if (err) throw err;
                                                        if (result) {
                                                            res.send(true);
                                                        }
                                                        else {
                                                            res.send({result: false, message: "edit comment failed"});
                                                        }
                                                    });
                                                }
                                                else {
                                                    res.send({result: false, message: "Unauthorized"});
                                                }
                                            }
                                        }
                                        else {
                                            res.send({result: false, message: "you have blocked the post owner "}); // redis
                                        }
                                    }
                                    else {
                                        res.send({result: false, message: "you have been blocked by the post owner"}); // redis
                                    }
                                }
                                else {
                                    res.send({result: false, message: "user info not found in cache"}); // redis
                                }
                            });
                        }
                        else {
                            res.send({result: false, message: "post not found"});
                        }
                    });
                }
                else {
                    res.send({result: false, message: "Not Authenticated"});
                }
            }
            else {
                res.send({result: false, message: "504 Bad Request"});
            }
        }
    },
    delete: function (req, res, user) {
        if (req.body && req.body.commentId && typeof req.body.commentId === "string" && req.body.postId && typeof req.body.postId === "string") {
            let postOwnerId = req.body.postId.split("|-p-|")[0];
            if(user) {
                if ((user.roles.indexOf("superuser") > -1) || (user.roles.indexOf("sabet") > -1) || (user.roles.indexOf("admin") > -1)) { // owner access + superuser access
                    commentSchema.findOneAndUpdate({
                        postId: req.body.postId,
                        commentId: req.body.commentId,
                        deleted: false,
                    }, {
                        $set: {
                            deleted: true,
                        }
                    }, function (err, result) {
                        if (err) throw err;
                        if(result) {
                            res.send(true);
                        }
                        else{
                            res.send({result:false,message:"Delete Comment Failed"});
                        }
                    });

                }
                else {
                    if (user.userId === postOwnerId) { // owner access + superuser access
                        commentSchema.findOneAndUpdate({
                            postId: req.body.postId,
                            commentId: req.body.commentId,
                            postOwnerId: postOwnerId,
                            deleted: false,
                        }, {
                            $set: {
                                deleted: true,
                            }
                        }, function (err, result) {
                            if (err) throw err;
                            if(result) {
                                res.send(true);
                            }
                            else{
                                res.send({result:false,message:"Delete Comment Failed"});
                            }
                        });

                    }
                    else{ // try to be comment owner
                        commentSchema.findOneAndUpdate({
                            postId: req.body.postId,
                            commentId: req.body.commentId,
                            postOwnerId: postOwnerId,
                            ownerId : user.userId,
                            deleted: false,
                        }, {
                            $set: {
                                deleted: true,
                            }
                        }, function (err, result) {
                            if (err) throw err;
                            if(result.n > 0) {
                                res.send(true);
                            }
                            else{
                                res.send({result:false,message:"404/401 --> Comment not found or Unauthorized access"});
                            }

                        });
                    }
                }
            }
            else{
                res.send({result:false,message:"403 Not authorized"});
            }
        }
        else {
            res.send({result: false, message: "504 Bad request"});
        }
    },
    deactive: function (req, res, user, ownerId, commentId) { // deactive all cms of a person // deactive a single comment
        let updates = {};
        let query = {};
        if (user && (user.roles.indexOf("sabet") > -1 || user.roles.indexOf("admin") > -1 || user.roles.indexOf("superuser") > -1)) {
            if (!commentId) {
                updates = {
                    $set: {
                        deactive: true,
                    }
                };
                query = {
                    ownerId: ownerId,
                };
                commentSchema.updateMany(query, updates, function (err, result) {
                    if (err) throw err;
                    if (result.n > 0) {
                        res.send(true);
                    }
                    else {
                        res.send({result: false, message: "deactive comments for user" + ownerId});
                    }
                });
            }
            else {
                if (commentId && typeof commentId === "string") {
                    updates = {
                        $set: {
                            deactive: true,
                        }
                    };
                    query = {
                        ownerId: ownerId,
                        commentId : commentId,
                        deactive:false,
                    };
                    if (req.body.reject && typeof req.body.reject === "string") {
                        postSchema.findOneAndUpdate(query, updates, function (err, result) {
                            if (err) throw err;
                            console.log(result);
                            res.send(true);
                        });
                    }
                    else {
                        res.send({result: false, message: "bad request"});
                    }
                }
            }
        }
        else{
            res.send({result:false,message:"401 Unauthorized"});
        }
    },
};


module.exports = comments;