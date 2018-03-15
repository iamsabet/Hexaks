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

    getFollowersPaginated: function(req, res,user,hostId,timeOrigin,counts,pageNumber) {

        let query = {
            "follower": {$exists: true},
            "following": hostId,
            deactive: false,

        };
        let options = {
            select: 'follower followId following',
            sort: {updatedAt: +1},
            page: pageNumber,
            limit: parseInt(counts)
        };
        redisClient.hgetall(hostId + ":info", function (err, info) {
            if (err) throw err;
            if (info) {
                if (hostId === user.userId) {

                    follows.Paginate(query, options, req, res); // Authorized
                }
                else {
                    if (JSON.parse(info.privacy)) {
                        if(user.followings.indexOf(hostId)) {
                            follows.Paginate(query, options, req, res); // Authorized
                        }
                        else{
                            res.send({result:false,message:"Content is priovate"});
                        }
                    }
                    else{ // not private
                        follows.Paginate(query, options, req, res); // Authorized
                    }
                }
            }
            else{
                res.send({result:false,message:"user info not found in cache"});
            }
        });
    },
    getFollowingsPaginated: function(req, res,user,hostId,timeOrigin,counts,pageNumber) {

        let query = {
            "following": {$exists: true},
            "follower": hostId,
            deactive: false,

        };
        let options = {
            select: 'following followId',
            sort: {updatedAt: +1},
            page: pageNumber,
            limit: parseInt(counts)
        };
        redisClient.hgetall(hostId + ":info", function (err, info) {
            if (err) throw err;
            if (info) {
                if (hostId === user.userId) {

                    follows.Paginate(query, options, req, res); // Authorized
                }
                else {
                    if (JSON.parse(info.privacy)) {
                        if(user.followings.indexOf(hostId)) {
                            follows.Paginate(query, options, req, res); // Authorized
                        }
                        else{
                            res.send({result:false,message:"Content is priovate"});
                        }
                    }
                    else{ // not private
                        follows.Paginate(query, options, req, res); // Authorized
                    }
                }
            }
            else{
                res.send({result:false,message:"user info not found in cache"});
            }
        });
    },
    follow:function(req,res,user){
        let hostId = req.body.followingId;
        console.log(hostId);
        console.log(user.userId);
        if(req.body && req.body.blockId && user.blockList.indexOf(req.body.followingId.toString()) === -1) {
            redisClient.hgetall(hostId + ":info", function (err, info) {
                if (err) res.send({result: false, message: "500 error in follow"});
                if (!err && info) {
                    if (req.body && req.body.followingId) {
                        let followObject = {
                            follower: user.userId,
                            following: req.body.followingId,
                        };
                        if (user.followings.indexOf(req.body.followingId) === -1) {
                            if (!JSON.parse(info.privacy)) {
                                console.log(JSON.parse(info.privacy));
                                user.save();
                                userSchema.update({userId: followObject.follower}, {
                                    $inc: {followingsCount: +1},
                                    $addToSet: {followings: followObject.following}
                                }, function (err, result) {
                                    if (err) throw err;
                                    if (result)
                                        console.log(result);
                                });
                                userSchema.update({userId: followObject.following}, {
                                    $inc: {followersCount: +1},
                                }, function (err, result) {
                                    if (err) throw err;
                                    if (result)
                                        console.log(result);
                                });
                            }
                            Follow.create(req, res, followObject, info);
                        }
                        else {
                            res.send({result: true, message: "already followed"});
                        }
                    }
                    else {
                        if (!err)
                            res.send({result: false, message: "Bad input"});
                    }
                }
                else {
                    if (!err)
                        res.send({result: false, message: "404 - user info not found in cache"});
                }
            });
        }
        else{
            res.send({result:false,message:"This action fails on Blocked user"})
        }
    },
    unfollow:function(req,user,hostId,res){
        if(user.followings.indexOf(hostId) > -1) {
            if (req.body && req.body.followingId) {
                let unfollowObject = {
                    follower: user.userId,
                    following: req.body.followingId,
                };
                user.save();
                userSchema.update({userId: unfollowObject.follower},{
                    $inc: {followingsCount: -1},
                    $pull: {followings: unfollowObject.following}
                },function(err,result){
                    if(err) throw err;
                    if(result)
                        console.log(result);
                });
                userSchema.update({userId: unfollowObject.following}, {
                    $inc: {followersCount: -1}
                },function(err,result){
                    if(err) throw err;
                    if(result)
                        console.log(result);
                });
                Follow.Remove(req,unfollowObject,res);
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