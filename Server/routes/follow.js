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
    Create: function(req,res,user) {
        // not blocked - check can see post
        var postId = req.body.postId;
        var ownerId = req.body.ownerId;
        var postOwnerId = req.body.postOwnerId;
        var text = req.body.text;



        var reHashtag = /(?:^|[ ])#([a-zA-Z]+)/gm;
        var reMention = /(?:^|[ ])@([a-zA-Z]+)/gm;
        var str = text;
        var m;
        var hashtags = [];
        var mentions = [] ;

        while ((m = reHashtag.exec(str)) != null) {
            if (m.index === reHashtag.lastIndex) {
                reHashtag.lastIndex++;
            }
            if(hashtags.indexOf(m[0]) === -1){
                hashtags.push(m[0]);
            }
        }
        var n;
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
        var id = req.params.id;
        data.splice(id, 1); // Spoof a DB call
        res.send(true);
    }
};


module.exports = follows;