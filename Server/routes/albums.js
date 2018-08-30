const mongoose = require('mongoose');
var postSchema = require('../models/post.model');
var post = new postSchema();
var albumSchema = require('../models/album.model');
var secret = require('../config/secret');
var album = new albumSchema();
var posts = require("./posts");
var users = require("./users");
var bcrypt = require("bcrypt-nodejs");
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

        if (orderedBy === "createdAt" || orderedBy === "updatedAt" || orderedBy === "originalImage.cost" || orderedBy === "rate.points" || orderedBy === "rate.value" || orderedBy === "views") {
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
                options.sort = {"rate.points": -1};
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
    create: function(req,res,user,callback) {
        var albumId = CryptoJS.AES.encrypt((user.userId + "|-a-|" + counts + ":" + random.generate(10)).toString(), secret.albumIdKey).toString();
        album.findOne({albumId:albumId},function(err,albume){
            if(err) {
                res.send({result: false, message: "Oops Something went wrong - please try again"});
            }
            if(albume){
                res.send({result:false,message:"albume already exists"});
            }
            else {
                var albumObject = {
                    albumId : albumId,
                    owner : {
                        username: user.username,
                        profilePicUrl:user.profilePictureUrl,
                    },
                    products: [],
                    hashtags:[],
                    category:"",
                    title : "",
                    caption : "",
                    rate:{
                        number:0.0,
                        counts: 0,
                    },
                    albumArtUrl : "", // preview images
                    curator : {
                        username:"",
                        profilePicUrl:"",
                    },

                };
                album.create(albumObject,function(albumId){
                    return callback(albumId);
                });


            }
        });


    },

    update: function(req, res,next,data) {
        var updateuser = req.body;
        var id = req.params.id;
        data[id] = updateuser; // Spoof a DB call
        res.json(updateuser);
    },
    submitAlbum:function(req,res,user){
        redisClient.get(user.username + "::uploadingPost", function (err, value) {
            if(err) throw err;
            if(value){

            }
            else{

            }
        });
    },
    delete: function(req, res,next,data) {
        var id = req.params.id;
        data.splice(id, 1); // Spoof a DB call
        res.json(true);
    }
};


module.exports = albums;