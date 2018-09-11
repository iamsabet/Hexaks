var CryptoJS = require("crypto-js");
var followSchema = require('../models/follow.model');
var Follow = new followSchema();
var userSchema = require('../models/user.model');

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
    follow:function(followObject,hostPrivacy,callback){
        Follow.create(followObject,hostPrivacy,function(resultx){
            return callback(resultx);
        });
    },
    unfollow:function(unfollowObject,callback){
        Follow.remove(unfollowObject,function(resultx){
            return callback(resultx);
        });
    },
    accept:function(followObject,ownerId,callback){
        let now = Date.now();
        followObject.following = ownerId; 
        followObject.activated = true;
        followObject.accepted = false;
        followSchema.findOneAndUpdate(followObject,{
            $set:{
                accepted:true,
                updatedAt:now
            }
        },{
            "fields":{
                "follower":1,
                "accepted":1
            }
        },function(err,resultf){
            if(err) throw err;
            if(resultf){
                return callback(resultf);
            }
            else{
                return callback({result:false,message:"update follow object to accept true failed / or follow object not found"});
            }
        });
    },
    reject:function(followId,ownerId,callback){
        Follow.remove(followId,ownerId,function(resultx){
            return callback(resultx);
        });
    },
    check:function(follower,following,callback){
        Follow.check(follower,following,function(resultx){
            return callback(resultx);
        });
    },
};


module.exports = follows;