const mongoose = require('mongoose');
var postSchema = require('../models/post.model');
var post = new postSchema();
var albumSchema = require('../models/album.model');
var secret = require('../config/secret');
var album = new albumSchema();
var posts = require("./posts");
var CryptoJS = require("crypto-js");
var Float = require('mongoose-float').loadType(mongoose);
var users = require('./users');
var random = require('randomstring');
var bcrypt = require("bcrypt-nodejs");
var redis = require('redis');
// resize and remove EXIF profile data
var redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});
var randomString = require("randomstring");
/* GET home page. */
var albums = {

    paginate: function(req, res,user,userIds,timeOrigin,timeEdgeIn,orderBy,hashtags,category) {

        var orderedBy = orderBy || "counts";
        var privateOrNot = isPrivate || false;
        var hashtagQuery = {$exists:true};
        var categoryQuery = {$exists:true};
        if(hashtags && hashtags.length > 0){
            if(hashtags[0]!=="")
                hashtagQuery = {$in:hashtags};
        }
        if(category && category.length > 0){
            if(category[0] !== "" && category[0] !== "All")
                categoryQuery = {$in:category};
        }

        if (orderedBy === "createdAt" || orderedBy === "updatedAt" || orderedBy === "originalImage.cost" || orderedBy === "rate.number" || orderedBy === "rate.value" || orderedBy === "views") {
            // timeWindow

            let costQuery = {cost: {$gte: left, $lte: right}};
            if(left === 0 && right === 1000000){
                costQuery = {$exists:true};
            }
            if(privateOrNot === true){
                privateOrNot = {$exists:true};
            }
            let userId = {$in:userIds};
            if(userIds.length === 1){
                userId = userIds[0];
            }

            if(userIds ==="all"){
                if(user) {
                    userId = {$nin: user.blockList}
                }
                else{
                    userId = {$exists: true}
                }
            }
            console.log(userId);
            let query = {
                ownerId : userId,
                activated: (activated || true),
                hashtags:hashtagQuery,
                categories:categoryQuery,
                private: privateOrNot,
                deleted:false,
            };
            if(userIds.length === 1 && user && (userIds[0] === user.userId)){
                query.rejected = {$exists:true};
            }

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

            let options = {
                select: 'albumId postIds counts createdAt updatedAt reportsCount rate views',
                sort: {createdAt: -1},
                page: pageNumber,
                limit: parseInt(counts)
            };
            if(userIds === "all"){
                query.ownerId= {$exists:true};
            }
            else{
                if(userIds.length === 1) {
                    timeEdge = (timeOrigin - (120 * 744 * 3600 * 1000)); // 31 days
                    query["updatedAt"] = {$lt: timeOrigin};  // time edge up to 31 days
                }
                else{
                    query["updatedAt"] = {$gte: timeEdge, $lt: timeOrigin};
                }
            }
            if (orderBy === "counts") {
                options.sort = {"counts": -1};
            }
            else if (orderBy === "updatedAt") {
                options.sort = {"updatedAt": -1};
            }
            else if (orderBy === "createdAt") {
                options.sort = {"createdAt": -1};
            }
            else if (orderBy === "reports") {
                options.sort = {"reportsCount": -1};
            }
            else if (orderBy === "rate.value") {
                options.sort = {"rate.value" : -1};
            }
            else if (orderBy === "rate") {
                options.sort = {"rate.number": -1};
            }
            else if(orderBy === "views"){ // "views"
                options.sort = {views: -1};
            }
            console.log(query);
            console.log(options);
            album.Paginate(query, options,user,req,res);
        }
    },

    getOne: function(req, res,next,user) {
        var id = req.params.id;
        var user = data[0]; // Spoof a DB call
        res.json(user);
    },
    addPost: function(req, res,user,albumId,postId) {

        postSchema.updateOne({postId:postId},{$set:{albumId:albumId}},function(err,result) {
            if (err) throw err;
            if (albume) {
                console.log(result);
            }
        });
    },
    create: function(req,res,user) {
        if(typeof req.body.title==="string" && req.body.title.length > 0){
            var albumId = CryptoJS.AES.encrypt((user.userId + "|-a-|" + random.generate(10)).toString(), secret.albumIdKey).toString();
            albumSchema.findOne({albumId:albumId},function(err,albume){
                if(err) {
                    res.send({result: false, message: "Oops Something went wrong - please try again"});
                }
                if(albume){
                    res.send({result:false,message:"albume already exists"});
                }
                else {
                    var albumObject = {
                        albumId : albumId, // must have ownerId after Encryption
                        ownerId : user.userId,
                        thumbnail : "", // 1 post id - default - first one - can be chosen by user
                        collaborators : [], // userIds who can attach posts in this album shared by the owner [] default
                        title : req.body.title,
                        views : 0, // all children views
                        rate : {      // for all childrennew and old
                            number: 0.0,
                            counts : 0,
                            value : 0.0
                        },
                        activated:true,
                        deleted:false,
                        reportsCount : 0,
                        counts : 0, // number of children // max size : 500
                        createdAt : Date.now(),
                        updatedAt : Date.now()
                    };
                    album.Create(albumObject,function(resultxx){
                        if(resultxx)
                            res.send(albumId);
                    });
                }
            });
        }
        else{
            res.send({result:false,message:"Cant Create Album Without Title"});
        }
    },
    getAccessibles : function(req,res,user) {
        albumSchema.find({
            $or: [{ownerId: user.userId}, {collaborators:[user.userId]}],
            activated: true
        }, {
            title:1,
            albumId:1,
            createdAt:1,
            ownerId:1,
            updatedAt:1,
            counts:1
        }, function (err, albumsList) {
            if (err) throw err;
            if (albumsList) {
                res.send(albumsList);
            }
            else {
                console.log("album update failed err : " + JSON.stringify(albumsList));
            }
        });
    },
    increaseAlbumViews:function(albumId,callback){
        albumSchema.update({albumId:albumId,activated:true,deleted:false},{
            $inc: {
                views: 1
            }
        },function(err,result){
            if(err) throw err;
            console.log(result);
            if(result.n > 0){
                return callback(true);
            }
            else{
                return callback({result:false,message:"post owner views didnt increase"});
            }
        });
    },
    update: function(req, res,next,data) {
        var updateuser = req.body;
        var id = req.params.id;
        data[id] = updateuser; // Spoof a DB call
        res.json(updateuser);
    },
    delete: function(req, res,next,data) {
        var id = req.params.id;
        data.splice(id, 1); // Spoof a DB call
        res.json(true);
    }
};


module.exports = albums;