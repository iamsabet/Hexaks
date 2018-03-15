const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var postSchema = require('../models/post.model');
var post = new postSchema();
var userSchema = require('../models/user.model');
var User = new userSchema();
var pixelSchema = require('../models/pixel.model');
var pixel = new pixelSchema();
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
var followSchema = require('../models/follow.model');
var Follow = new followSchema();

var redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});

var follows = {

    getFollowersPaginated: function(req, res,user,timeOrigin,counts,pageNumber) {

        // Decrypt
        var bytes  = CryptoJS.AES.decrypt(postId, 'postSecretKey 6985');
        var plaintext = bytes.toString();

        let query = {
            "ownerId" : ownerId,
            "postId" : postId,
            diactive: false,

        };
        if (timeEdge <= (31*24) && timeEdge > -1) {
            if(timeEdge !== 0) {
                timeEdge = (timeOrigin - (timeEdge * 3600 * 1000));
                query.createdAt = {$gte:timeEdge,$lt:timeOrigin} // time edge up to 31 days
            }
        }
        else{
            timeEdge = (timeOrigin - (3600 * 1000)); // 1day
            query.createdAt = {$gte: timeEdge,$lt:timeOrigin} // time edge up to 31 days
        }
        if (isCurated===true) {
            query.isCurated = isCurated;
            if(curator !== "" && curator !== undefined) {
                query.curator = {
                    username: curator
                };
            }
        }
        let options = {
            select: 'postId owner createdAt caption largeImage views private rejected activated updatedAt curator hashtags categories exifData originalImage views isCurated ext advertise rate',
            sort: {createdAt: +1},
            page: pageNumber,
            limit:counts
        };
        // console.log(query);
        // console.log(options);
        post.Paginate(query, options,req,res);
    },
    getFollowingsPaginated: function(req, res,user,postId,timeOrigin,timeEdgeIn,counts,pageNumber) {

        // Decrypt
        var bytes  = CryptoJS.AES.decrypt(postId, 'postSecretKey 6985');
        var plaintext = bytes.toString();



        console.log(timeEdgeIn);
        var timeEdge = timeEdgeIn;
        let query = {
            "ownerId" : ownerId,
            "postId" : postId,
            diactive: false,

        };
        if (timeEdge <= (31*24) && timeEdge > -1) {
            if(timeEdge !== 0) {
                timeEdge = (timeOrigin - (timeEdge * 3600 * 1000));
                query.createdAt = {$gte:timeEdge,$lt:timeOrigin} // time edge up to 31 days
            }
        }
        else{
            timeEdge = (timeOrigin - (3600 * 1000)); // 1day
            query.createdAt = {$gte: timeEdge,$lt:timeOrigin} // time edge up to 31 days
        }
        if (isCurated===true) {
            query.isCurated = isCurated;
            if(curator !== "" && curator !== undefined) {
                query.curator = {
                    username: curator
                };
            }
        }
        let options = {
            select: 'postId owner createdAt caption largeImage views private rejected activated updatedAt curator hashtags categories exifData originalImage views isCurated ext advertise rate',
            sort: {createdAt: +1},
            page: pageNumber,
            limit:counts
        };
        // console.log(query);
        // console.log(options);
        post.Paginate(query, options,req,res);
    },
    follow:function(req,res,user){
        let hostId = req.body.followingId;
        console.log(hostId);
        console.log(user.userId);
        redisClient.hgetall(hostId+":info",function(err,info) {
            if(err) res.send({result:false,message:"500 error in follow"});
            if(!err && info) {
                if (req.body && req.body.followingId) {
                    let followObject = {
                        follower: user.userId,
                        following: req.body.followingId,
                    };
                    if(user.followings.indexOf(req.body.followingId) === -1) {
                        if(!JSON.parse(info.privacy)){
                            console.log(JSON.parse(info.privacy));
                            userSchema.findOneAndUpdate({userId: followObject.follower,deactive:false}, {
                                $inc: {followingsCount: +1},
                                $addToSet: {followings: followObject.following}
                            });
                            userSchema.findOneAndUpdate({userId: followObject.following,deactive:false}, {
                                $inc: {followersCount: +1},
                            });
                        }
                        Follow.Create(req, res, followObject, info);
                    }
                    else {
                        res.send({result: true, message: "already followed"});
                    }
                }
                else {
                    if(!err)
                        res.send({result: false, message: "Bad input"});
                }
            }
            else{
                if(!err)
                    res.send({result:false,message:"404 - user info not found in cache"});
            }
        });
    },
    unfollow:function(req,res,user){
        if(user.followings.indexOf(req.body.followingId) > -1) {
            if (req.body && req.body.followingId) {
                let unfollowObject = {
                    follower: user.userId,
                    following: req.body.followingId,
                };
                userSchema.findOneAndUpdate({userId: unfollowObject.follower},{
                    $inc: {followingsCount: -1},
                    $pull: {followings: unfollowObject.following}
                });
                userSchema.findOneAndUpdate({userId: unfollowObject.following}, {
                    $inc: {followersCount: -1}
                });
                Follow.Remove(req, res, unfollowObject);
            }
            else {
                res.send({result: false, message: "Bad input"});
            }
        }
        else{
            res.send({result:true,message:"not followed yet"});
        }
    },

};


module.exports = follows;