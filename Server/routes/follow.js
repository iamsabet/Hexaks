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
        if(req.body && req.body.followingId) {
            var followObject = {
                follower: user.userId,
                following: req.body.followingId,
            };

            userSchema.update({username: followObject.follower}, {
                $inc: {followingsCount: 1},
                $addToSet: {followings: followObject.following}
            }, function (err, rest) {
                if (err) throw err;
                console.log(rest);
            });
            Follow.Create(req, res, followObject);
        }
        else{
            res.send({result:false,message:"Bad input"});
        }
    },
    unfollow:function(req,res,user){
        if(req.body && req.body.followingId) {
            var unfollowObject = {
                follower: user.username,
                following: req.body.followingId,
            };
            userSchema.update({username: unfollowObject.follower}, {
                $inc: {followingsCount: -1},
                $pull: {followings: unfollowObject.following}
            }, function (err, rest) {
                if (err) throw err;
                console.log(rest);
            });
            Follow.Remove(req, res, unfollowObject);
        }
        else{
            res.send({result:false,message:"Bad input"});
        }
    },

};


module.exports = follows;