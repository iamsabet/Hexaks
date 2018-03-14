const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var postSchema = require('../models/post.model');
var post = new postSchema();
var userSchema = require('../models/user.model');
var User = new userSchema();
var followSchema = require('../models/follow.model');
var follow = new followSchema();
var rateSchema = require('../models/rate.model');
var rate = new rateSchema();
var bcrypt = require("bcrypt-nodejs");
var ExifImage = require('exif').ExifImage;
var Float = require('mongoose-float').loadType(mongoose);
var users = require('./users');
var redis = require("redis");
var requestIp = require("request-ip");
var findHashtags = require('find-hashtags');
var CryptoJS = require("crypto-js");

var redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});

var comments = {

    getPostComments: function(req, res,user,timeOrigin,timeEdgeIn,postId,counts,pageNumber) {
        postSchema.findOne({postId:postId},{privacy:1, postId:1},function(err,post){
            if(err) res.send({result:false,message:"500 post found for comments"});
            if(post){
                // Decrypt post id to get owner id from it
                let bytes  = CryptoJS.AES.decrypt(postId, 'postSecretKey 6985');
                let postOwnerId = bytes.toString().split(":--:")[0];
                let timeEdge = timeEdgeIn;
                let query = {
                    "ownerId": postOwnerId,
                    "postId": postId,
                    deactive: false,

                };
                if (timeEdge <= (31 * 24) && timeEdge > -1) {
                    if (timeEdge !== 0) {
                        timeEdge = (timeOrigin - (timeEdge * 3600 * 1000));
                        query.createdAt = {$gte: timeEdge, $lt: timeOrigin} // time edge up to 31 days
                    }
                }
                else {
                    timeEdge = (timeOrigin - (24 * 31 * 3600 * 1000)); // 2 years
                    query.createdAt = {$gte: timeEdge, $lt: timeOrigin} // time edge up to 31 days
                }

                let options = {
                    select: 'postId owner createdAt caption largeImage views private rejected activated updatedAt curator hashtags categories exifData originalImage views isCurated ext advertise rate',
                    sort: {createdAt: +1},
                    page: pageNumber,
                    limit: counts
                };


                if (post.privacy && user.notAuth && user.notAuth === true) {
                    redisClient.hgetall(postOwnerId+":info",function(err,info) {
                        if(!err && info){
                            if(info.privacy){
                                res.send({result:false,message:"401 Unauthorized - Private contents not accessible for not authenticated users -> login or reg first"});
                            }
                            else{
                                comments.Paginate(query, options, req, res);
                            }
                        }
                        else{
                            res.send({result:false,message:"owner info not found"});
                        }
                    });
                    res.send({
                        result: false,
                        message: "Content is private : follow the owner of the post to access these contents"
                    });
                }
                else if (post.privacy && !user.notAuth) {
                    if(postOwnerId === user.userId){

                        comments.Paginate(query, options, req, res);

                    }
                    else {
                        redisClient.hgetall(postOwnerId+":info",function(err,info) {
                            if (!err && info) {
                                if (!info.privacy) {
                                    post.Paginate(query, options, req, res);
                                }
                                else {
                                    followSchema.findOne({
                                        follower: user.userId,
                                        following: postOwnerId,
                                        accepted: true,
                                        deactive: false
                                    }, function (err, flw) {
                                        if (err) res.send({
                                            result: false,
                                            message: "500 follow not found error for comments"
                                        });
                                        if (flw) { // access authorized user to private data

                                            comments.Paginate(query, options, req, res);

                                        }
                                        else {

                                            res.send({result: false, message: "401 Unauthorized"});
                                        }
                                    });
                                }
                            }
                            else{
                                res.send({result:false,message:"user info not found in cache"}); // redis
                            }
                        });
                    }
                }
                else {

                    comments.Paginate(query, options, req, res);
                }
            }
            else{
                if(err) res.send({result:false,message:"404 post not found"});
            }
        });

    },

    Create: function(req,res,user) {
        // not blocked - check can see post
        let postId = req.body.postId;
        let ownerId = req.body.ownerId;
        let postOwnerId = req.body.postOwnerId;
        let text = req.body.text;

        let reHashtag = /(?:^|[ ])#([a-zA-Z]+)/gm;
        let reMention = /(?:^|[ ])@([a-zA-Z]+)/gm;
        let str = text;
        let m;
        let hashtags = [];
        let mentions = [] ;

        while ((m = reHashtag.exec(str)) != null) {
            if (m.index === reHashtag.lastIndex) {
                reHashtag.lastIndex++;
            }
            if(hashtags.indexOf(m[0]) === -1){
                hashtags.push(m[0]);
            }
        }
        let n;
        while ((n = reMention.exec(str)) != null) {
            if (m.index === reMention.lastIndex) {
                reMention.lastIndex++;
            }
            if(hashtags.indexOf(n[0]) === -1){
                mentions.push(n[0]);
            }
        }

        if (postId) {
            let commentObject = {
                postId : postId,
                postOwnerId : postOwnerId,
                ownerId : ownerId,
                mentions:[], // usernames @
                hashtags : [], // #
                fullText:text,
                diactive:false,
            };
            post.create(commentObject, function (result) {
                if (result !== null) {
                    console.log("commentId : "+result);
                    return callback(result);
                }
                else {
                    return callback(null);
                }
            });
        }
        else{
            return callback({result:false,message:"No posts uploaded yet"});
        }
    },
    edit:function(req,res,user){

    },
    delete: function(req, res,next,data) {
        let id = req.params.id;
        data.splice(id, 1); // Spoof a DB call
        res.send(true);
    }
};


module.exports = comments;