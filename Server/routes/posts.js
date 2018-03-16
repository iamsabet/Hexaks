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
var Rate = new rateSchema();
var rateSchema = require('../models/rate.model');
var rate = new rateSchema();
var bcrypt = require("bcrypt-nodejs");
var ExifImage = require('exif').ExifImage;
var Float = require('mongoose-float').loadType(mongoose);
var users = require('./users');
var redis = require("redis");
var requestIp = require("request-ip");

var redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});


var posts = {

    getPostsByFiltersAndOrders: function(req, res,user,userIds,orderBy,isCurated,hashtags,category,curator,rejected,activated,isPrivate,leftCost,rightCost,timeOrigin,timeEdgeIn,counts,pageNumber) {

        var right = rightCost || 1000000;
        var left = leftCost || 0;
        var orderedBy = orderBy || "createdAt";
        var privateOrNot = isPrivate || false;
        var reject = rejected || false;
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
        console.log(timeEdgeIn);
        let timeEdge = timeEdgeIn;
        if (orderedBy === "createdAt" || orderedBy === "originalImage.cost" || orderedBy === "rate.points" || orderedBy === "rate.value" || orderedBy === "views") {
            // timeWindow

            let costQuery = {cost: {$gte: left, $lte: right}};
            if(left === 0 && right === 1000000){
                costQuery = {$exists:true};
            }
            if(privateOrNot === true){
                privateOrNot = {$exists:true};
            }
            let userId = {$in:userIds};
            if(userIds ==="all"){
                userId = {$nin:user.blockList}
            }
            console.log(userId);
            let query = {
                ownerId : userId,
                activated: activated || true,
                "rejected.value":reject,
                hashtags:hashtagQuery,
                categories:categoryQuery,
                originalImage: costQuery,
                private: privateOrNot,
                deleted:false,
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
                query.curatorId =  {$exists:true};
                if(curator !== "" && curator !== undefined) {
                    query.curatorId = curator;
                }
                else{
                    query.curatorId = {$ne:""};
                }
            }
            let options = {
                select: 'postId owner createdAt ownerId mentions caption largeImage views private rejected activated updatedAt curator hashtags categories exifData originalImage views ext advertise rate',
                sort: {createdAt: +1},
                page: pageNumber,
                limit: parseInt(counts)
            };
            if(userIds === "all"){
                query.ownerId= {$exists:true};
            }
            if (orderBy === "originalImage.cost") {
                options.sort = {"originalImage.cost": -1};
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
            // console.log(query);
            // console.log(options);
            post.Paginate(query, options,req,res);
        }
    },

    Create: function(user,format,postId,callback) {
        if (postId) {
            let postObject = {
                postId: postId,
                ownerId:user.userId,
                ext: format,
                exifData: {},
                originalImage: { // yeki beyne 2000 ta 3000 yeki balaye 4000 --> age balaye 4000 bud yekiam miari azash roo 2000 avali bozorge 2vomi kuchike -- > suggest --> half resolution half price .
                    cost: 0, // 0 if free
                    resolution: {
                        x: 100,
                        y: 100,
                    },
                },
                buyers: [], // user id
                hashtags: [],
                generatedHashtags: [],
                categories: [],
                caption: "",
                rate: {
                    value: 0.0,
                    points : 0.0,
                    counts: 0,
                },
                views: 0,
                // viewers: [],// usernames // length
                curatorId:"",
                private: false,
                rejected: {
                    value: false,
                    reason: "",
                },
                advertise: {},
                activated: false,
                deleted:false,
            };
            post.create(postObject,user.username, function (result) {
                if (result !== null) {
                    console.log("postId : "+result);
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
    getPostInfo: function(req,res,user,postId){

        if(postId && typeof postId === "string") {
            let bytes = CryptoJS.AES.decrypt(postId, 'postSecretKey 6985');
            let postOwnerId = bytes.toString().split(":--:")[0];
            let options = {
                albumId: 1, // null if not
                postId: 1,
                ownerId: 1,
                originalImage: 1,
                ext: 1,
                exifData: 1,
                // largeImage:1,
                buyers: 1, // user id
                hashtags: 1,
                generatedHashtags: 1,
                categories: 1,
                caption: 1,
                rate: 1,
                views: 1,    // viewers.length length
                curatorId: 1,
                private: 1,
                rejected: 1,
                advertise: 1,
                activated: 1,
                createdAt: 1,
                deleted: 1,
                updatedAt: 1
            };
            redisClient.hgetall(postOwnerId + ":info", function (err, info) {
                if (err) throw err;
                if (info) {
                    if (user === null) {
                        if (!JSON.parse(info.privacy)) {
                            postSchema.findOne({
                                postId: postId,
                                deleted: false,
                                rejected: {value: false, reason: ""},
                                activated: true
                            }, options, function (err, post) {
                                if (err) throw err;
                                if (post) {
                                    res.send(post);
                                }
                                else {
                                    res.send({result: false, message: "404 - Post not found"});
                                }
                            });
                        }
                        else {
                            postSchema.findOne({
                                postId: postId,
                                deleted: false,
                                rejected: {value: false, reason: ""},
                                private: false,
                                activated: true
                            }, options, function (err, post) {
                                if (err) throw err;
                                if (post) {
                                    res.send(post);
                                }
                                else {
                                    res.send({result: false, message: "404 - Post not found"}); // or private content access denied
                                }
                            });
                        }
                    }
                    else {
                        if (user.blockList.indexOf(postOwnerId) === -1) {
                            let blockList = JSON.parse(info.blockList);
                            if (blockList.indexOf(user.userId) === -1) {
                                if (JSON.parse(info.privacy)) {
                                    if ((user.followings.indexOf(postOwnerId) > -1) || (user.userId === postOwnerId) || (user.roles.indexOf("superuser") > -1) || (user.roles.indexOf("sabet") > -1) ||  (user.roles.indexOf("admin") > -1)) {
                                        postSchema.findOne({
                                            postId: postId,
                                            deleted: false,
                                            rejected: {value: false, reason: ""},
                                            activated: true
                                        }, options, function (err, post) {
                                            if (err) throw err;
                                            if (post) {
                                                res.send(post);
                                            }
                                            else {
                                                res.send({result: false, message: "404 - Post not found"});
                                            }
                                        });
                                    }
                                    else {
                                        postSchema.findOne({
                                            postId: postId,
                                            deleted: false,
                                            rejected: {value: false, reason: ""},
                                            private: false,
                                            activated: true
                                        }, options, function (err, post) {
                                            if (err) throw err;
                                            if (post) {
                                                res.send(post);
                                            }
                                            else {
                                                res.send({result: false, message: "404 - Post not found"}); // or private content access denied
                                            }
                                        });
                                    }
                                }
                                else {
                                    postSchema.findOne({
                                        postId: postId,
                                        deleted: false,
                                        rejected: {value: false, reason: ""},
                                        activated: true
                                    }, options, function (err, post) {
                                        if (err) throw err;
                                        if (post) {
                                            res.send(post);
                                        }
                                        else {
                                            res.send({result: false, message: "404 - Post not found"});
                                        }
                                    });
                                }
                            }
                            else {
                                res.send({result: false, message: "the post owner has blocked you"});
                            }
                        }
                        else {
                            res.send({result: false, message: "you blocked the post owner"});
                        }
                    }
                }
                else {
                    res.send({result: false, message: "host user not found in cache"});
                }
            });
        }
        else{
            res.send({result:false,message:"504 Bad request"});
        }
    },
    activate:function(req,res,user){
        redisClient.get(user.userId+":uploadingPost",function(err,postId){
            if(err) throw err;
            let cost = req.body.cost || 0;
            if(!isNaN(cost)) {
                if (postId && req.body.cost <= 1000000 && req.body.cost >= 0) {
                    try {
                        console.log(postId);
                        new ExifImage({image: '/Users/sabet/Projects/Hexaks/Server/Pictures/' + postId.split("===.")[0]+"."+postId.split("===.")[1]}, function (error, exifData) {
                            if (error) console.log("exif extraction failed  -- > file.format");
                            console.log(cost + " :: "+isNaN(cost));
                            console.log(exifData);
                            let exif = {};
                            if(exifData &&( postId.split(".")[1].toLowerCase()=== "jpeg" || postId.split(".")[1].toLowerCase() === "jpg")){
                                if(exifData) {
                                    exif = exifData.exif || {};
                                }
                            }
                            let reHashtag = /(?:^|[ ])#([a-zA-Z]+)/gm;
                            let reMention = /(?:^|[ ])@([a-zA-Z]+)/gm;
                            let str = 'Hey I love #apple and #orange and #apple!@ also #banana';
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

                                postSchema.update({
                                postId: postId.split("===.")[0],
                                activated: false,
                            },{
                                $set: {
                                    activated: true,
                                    exifData:exif,
                                    hashtags: hashtags,
                                    mentions : mentions,
                                    caption: req.body.caption || "",
                                    categories: req.body.categories || ["no cat"],
                                    originalImage: {
                                        cost: cost, // 0 if free
                                        resolution: {
                                            x: 200,
                                            y: 200,
                                        }
                                    }
                                }
                            },function(err,result){
                                if(err) throw err;
                                console.log(result);
                                redisClient.del(user.userId+":uploadingPost");
                                redisClient.del(user.userId+":isUploadingPost");
                                res.send(true);
                            });
                            posts.imageProcessing(postId.split("===.")[0] + "--Medium." + postId.split(".")[1]);
                        });
                    }
                    catch (err) {
                        console.log(err);
                        res.send({result: false, message: "Image exif extraction failed!" + err});
                    }
                }
            }
            else{
                res.send({result:false,message:"Oops Bad Request or no post found to activate"});
            }
        });
    },
    editPost : function(req,res,user){

        if(req.body && req.body.postId && typeof req.body.postId === "string") {
            let bytes = CryptoJS.AES.decrypt(req.body.postId, 'postSecretKey 6985');
            let postOwnerId = bytes.toString().split(":--:")[0];

            if(user.userId === postOwnerId || ( user.roles.indexOf("superuser") > -1 ) || (user.roles.indexOf("sabet") > -1)){ // owner access + superuser access

                let change = true;
                let updates = {};
                if(req.body.caption) {
                    let reHashtag = /(?:^|[ ])#([a-zA-Z]+)/gm;
                    let reMention = /(?:^|[ ])@([a-zA-Z]+)/gm;
                    let str = 'Hey I love #apple and #orange and #apple!@ also #banana';
                    let m;
                    let hashtags = [];
                    let mentions = [];
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
                    updates.hashtags = hashtags;
                    updates.mentions = mentions;
                    updates.caption = req.body.caption;
                }
                else if(req.body.category){
                    updates.categories = req.body.categories;
                }
                else if(req.body.private){
                    updates.private = req.body.private;
                }
                else{
                    change = false;
                }
                if(change) {
                    postSchema.update({
                        postId: req.body.postId,
                        ownerId:postOwnerId,
                        activated: true,
                    }, {
                        $set: updates
                    }, function (err, result) {
                        if (err) throw err;
                        console.log(result);
                        res.send(true);
                    });
                }
            }
            else{
                res.send({result:false,message:"401 Unauthorized"});
            }
        }
        else{
            res.send({result:false,message:"504 Bad request"});
        }
    },
    delete: function(req, res,user) {
        if(req.body && req.body.postId && typeof req.body.postId === "string") {
            let bytes = CryptoJS.AES.decrypt(req.body.postId, 'postSecretKey 6985');
            let postOwnerId = bytes.toString().split(":--:")[0];
            if(user.userId === postOwnerId || ( user.roles.indexOf("superuser") > -1 ) || (user.roles.indexOf("sabet") > -1)){ // owner access + superuser access

                postSchema.update({
                    postId: req.body.postId,
                    ownerId:postOwnerId,
                    delete:false,
                }, {
                    $set: {
                        delete:true,
                    }
                }, function (err, result) {
                    if (err) throw err;
                    console.log(result);
                    res.send(true);
                });

            }
            else{
                res.send({result:false,message:"401 Unauthorized"});
            }
        }
        else{
            res.send({result:false,message:"504 Bad request"});
        }
    },
    deactive: function(req, res,user,postId) {

        if(postId && typeof postId === "string") {
            let bytes = CryptoJS.AES.decrypt(postId, 'postSecretKey 6985');
            let postOwnerId = bytes.toString().split(":--:")[0];
            if(( user.roles.indexOf("superuser") > -1 ) || (user.roles.indexOf("sabet") > -1) || (user.roles.indexOf("admin") > -1)){ // owner access + superuser access
                if(req.body.reject && typeof req.body.reject === "string") {
                    postSchema.update({
                        postId: postId,
                        ownerId: postOwnerId,
                        activated:false,
                    }, {
                        $set: {
                            activated:true,
                        }
                    }, function (err, result) {
                        if (err) throw err;
                        console.log(result);
                        res.send(true);
                    });
                }
                else{
                    res.send({result:false,message:"bad request"});
                }
            }
            else{
                res.send({result:false,message:"401 Unauthorized"});
            }
        }
        else{
            res.send({result:false,message:"504 Bad request"});
        }
    },
    reject: function(req, res,user) {
        if(req.body && req.body.postId && typeof req.body.postId === "string") {
            let bytes = CryptoJS.AES.decrypt(req.body.postId, 'postSecretKey 6985');
            let postOwnerId = bytes.toString().split(":--:")[0];
            if(user.userId === postOwnerId || ( user.roles.indexOf("superuser") > -1 ) || (user.roles.indexOf("sabet") > -1) || (user.roles.indexOf("admin") > -1)){ // owner access + superuser access
                if(req.body.reject && typeof req.body.reject === "string") {
                    postSchema.update({
                        postId: req.body.postId,
                        ownerId: postOwnerId,
                    }, {
                        $set: {
                            reject: {
                                value:true,
                                reason : req.body.reason
                            },
                        }
                    }, function (err, result) {
                        if (err) throw err;
                        console.log(result);
                        res.send(true);
                    });
                }
                else{
                    res.send({result:false,message:"bad request"});
                }
            }
            else{
                res.send({result:false,message:"401 Unauthorized"});
            }
        }
        else{
            res.send({result:false,message:"504 Bad request"});
        }
    },




    imageProcessing:function(imageUrl){ // image processing on medium size
        console.log(imageUrl + " -- > image processing starts");

        // Jimp.read("../Private Files/x-large/"+Storage.filename(req,req.body.file),function (err, image) {
        //
        //         image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        //             // x, y is the position of this pixel on the image
        //             // idx is the position start position of this rgba tuple in the bitmap Buffer
        //             // this is the image
        //             var red = this.bitmap.data[idx];
        //             var green = this.bitmap.data[idx + 1];
        //             var blue = this.bitmap.data[idx + 2];
        //             var alpha = this.bitmap.data[idx + 3];
        //             gatheredPixels.push({postId: postId, position: idx, value: {r: red, g: green, b: blue, a: alpha}});
        //             // gather list of pixels --> insert many
        //             // rgba values run from 0 - 255
        //             // e.g. this.bitmap.data[idx] = 0; // removes red from this pixel
        //         }, function (cb) {
        //             pixels.collection.insertMany(gatheredPixels, [{
        //                     ordered: true,
        //                     rawResult: false
        //                 }],
        //                 function () {
        //                     console.log(gatheredPixels.length + " inserted pixels");
        //                 });
        //
        //         });
        //
        //     });
    },

    rate:function(req,res,user){ // caching for later
        if(user) {
            if(req.body && req.body.postId && typeof req.body.postId === "string" && req.body.rateNumber && parseInt(req.body.rateNumber) <= 7 && parseInt(req.body.rateNumber) >= 1) {
                let bytes = CryptoJS.AES.decrypt(req.body.postId, 'postSecretKey 6985');
                let postOwnerId = bytes.toString().split(":--:")[0];
                if(user.blockList.indexOf(postOwnerId) === -1) {
                    redisClient.hgetall(postOwnerId + ":info", function (err, info) {
                        if (err) throw err;
                        if (info) {
                            let blockList = JSON.parse(info.blockList);
                            if (blockList.indexOf(user.userId) === -1) {
                                postSchema.find({postId:req.body.postId},{privacy:1},function(err,post){
                                    if(err) throw err;
                                    if(post) {
                                        if (JSON.parse(info.privacy)) {
                                            if (user.followings.indexOf(postOwnerId)) {
                                            // Create Rate Object
                                            }
                                            else {
                                                res.send({result: false, message: "Cant Rate Private Post"});
                                            }
                                        }
                                        else {
                                            // Create Rate Object
                                        }
                                    }
                                    else{
                                        res.send({result: false, message: "Post Not Found"});
                                    }
                                });
                            }
                            else {
                                res.send({result: false, message: "post owner has blocked you"});
                            }
                        }
                        else {
                            res.send({result: false, message: "user info not found in cache"});
                        }
                    });
                }
                else{
                    res.send({result: false, message: "you have blocked the post owner"});
                }
            }
            else{
                res.send({result:false,message:"504 Bad Request"});
            }
        }
        else{
            res.send({result:false,message:"Not Authenticated"});
        }
    },
    view:function(req,res,user,postId) { // caching for later
        if(req.body && req.body.blockId && user.blockList.indexOf(req.body.blockId.toString()) === -1) {

        }
    },
    report:function(req,res,user){
        if(req.body && req.body.blockId && user.blockList.indexOf(req.body.blockId.toString()) === -1) {

        }
    },
};


module.exports = posts;