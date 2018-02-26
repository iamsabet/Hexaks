const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var postSchema = require('../models/post.model');
var post = new postSchema();
var userSchema = require('../models/user.model');
var User = new userSchema();
var albumSchema = require('../models/album.model');
var album = new albumSchema();
var Jimp = require("jimp");
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

var redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});

var comments = {

    getCommentsPaginated: function(req, res,user,postId,ownerId,pageNumber,counts,timeEdgeIn,timeOrigin) {

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
        var postId = req.body.postId;
        var ownerId = req.body.ownerId;
        var postOwnerId = req.body.postOwnerId;
        var text = req.body.text;
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
        res.json(true);
    }
};


module.exports = posts;