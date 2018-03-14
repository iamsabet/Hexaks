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
        var timeEdge = timeEdgeIn;
        if (orderedBy === "createdAt" || orderedBy === "originalImage.cost" || orderedBy === "rate.value" || orderedBy === "views" || orderedBy === "rate") {
            // timeWindow

            let costQuery = {cost: {$gte: left, $lte: right}};
            if(left === 0 && right === 1000000){
                costQuery = {$exists:true};
            }
            if(privateOrNot === true){
                privateOrNot = {$exists:true};
            }
            var userId = {$in:userIds};
            if(userIds ==="all"){
                userId = {$exists:true}
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
                limit: parseInt(counts)
            };
            if(userIds === "all"){
                query["ownerId"]= {$exists:true};
            }
            if (orderBy === "originalImage.cost") {
                options.sort = {"originalImage.cost": -1};
            }
            else if (orderBy === "rate.value") {
                options.sort = {"rate.value" : +1};
            }
            else if (orderBy === "rate") {
                options.sort = {rate: -1};
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
                    counts: 0,
                },
                views: 0,
                // viewers: [],// usernames // length
                curator: {
                    username: "",
                    profilePicUrl: "",
                },
                private: false,
                rejected: {
                    value: false,
                    reason: "",
                },
                isCurated : false,
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

    getPostInfo: function(req,res,user){

    },
    activate:function(req,res,user){
        redisClient.get(user.userId+"::uploadingPost",function(err,postId){
            if(err) throw err;
            var cost = req.body.cost || 0;
            if(!isNaN(cost)) {
                if (postId && req.body.cost <= 1000000 && req.body.cost >= 0) {
                    try {
                        new ExifImage({image: '/Users/sabet/Projects/Hexaks/Server/Pictures/' + postId}, function (error, exifData) {
                            if (error) console.log("exif extraction failed  -- > file.format");
                            console.log(cost + " :: "+isNaN(cost));
                            console.log(exifData);
                            var exif = {};
                            if(exifData &&( postId.split(".")[1].toLowerCase()=== "jpeg" || postId.split(".")[1].toLowerCase() === "jpg")){
                                if(exifData) {
                                    exif = exifData.exif || {};
                                }
                            }
                            var reHashtag = /(?:^|[ ])#([a-zA-Z]+)/gm;
                            var reMention = /(?:^|[ ])@([a-zA-Z]+)/gm;
                            var str = 'Hey I love #apple and #orange and #apple!@ also #banana';
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

                                postSchema.update({
                                postId: postId.split(".")[0],
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
                                redisClient.del(user.userId+"::uploadingPost");
                                redisClient.del(user.userId+"::isUploadingPost");
                                res.send(true);
                            });
                            posts.imageProcessing(postId.split(".")[0] + "--Medium." + postId.split(".")[1]);
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
        var post
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
    increaseViews:function(req,res,user){
        if(user) {
            if (!user.viewedPosts.includes(req.body.postId)) {
                if(user.viewedPosts.length === 1000)
                    user.viewedPosts

                res.send(true);
            }
            else {
                console.log("Already Viewed");
                res.send(false);

            }
        }
        else {
            postSchema.findOne({postId: req.body["postId"]}, {albumId: 0}, function (err, resultPost) {
                if (err) throw err;
                // if(){ // redis query check in 24hs list; if not -->
                resultPost.views += 1;
                resultPost.save();
                res.send(true);
                // }
                // else {
                //     res.send(false);
                // }
            });
        }
    },
    rate:function(req,res,user){
        if(req.body["rate"] && req.body["postId"]) {
            var rate = req.body["rate"];
            var postId = req.body["postId"];
            if (user) {
                if (err) throw err;
                if (rate <= 6 && rate >= 1 && postId) {
                    rateSchema.findOne({
                        postId: postId,
                        value: rate,
                    }, function (err, resultRate) {
                        if (err) throw err;
                        console.log(resultRate);
                        if(resultRate) {
                            if(resultRate.members.indexOf(user.username) > -1) {
                                resultRate.members.push(user.username);
                                resultRate.save();
                                users.createSuggestion(user.username,rate,postId,function(callback){
                                    if(callback)
                                        console.log("Suggested List Updated for user "+ user.username);
                                });
                                postSchema.findOne({postId: postId}, {albumId: 0}, function (err, resultPost) {
                                    if (err) throw err;
                                    if (resultPost) {
                                        if (resultPost.rate.value >= rate) {
                                            if (resultPost.rate.value !== rate) {
                                                resultPost.rate.value += Float((resultPost.rate.value - rate) / (resultPost.rate.counts + 1));
                                                console.log(resultPost.rate.value);
                                            }
                                            resultPost.rate.counts += 1;
                                            resultPost.save();

                                        }
                                        else {
                                            resultPost.rate.value -= Float((rate - resusltPost.rate.value) / (resultPost.rate.counts + 1));
                                            console.log(resultPost.rate.value);
                                            resultPost.rate.counts += 1;
                                            resultPost.save();
                                        }
                                    }
                                    else {
                                        res.send("no post found");
                                    }
                                });
                                res.send(true);
                            }
                            else{
                                res.send("Already Rated !");
                            }
                        }
                        else{
                            res.send("no rate found");
                        }
                    });
                }
                else {
                    res.send("504 - bad request");
                }
            }
            else {
                res.send("401 - not authenticated"); //
            }
        }
        else {
            res.send("invalid input");
        }
    },
    view:function(req,res,user,postId,redisClient) {
        if(user) {
            if (req.body.postId) {
                if (!user.viewedPosts.includes(req.body.postId)) {
                    if (user.viewedPosts.length === 200) {
                        userSchema.findOneAndUpdate({username:user.username},{$pop:{viewedPosts:-1}});
                    }
                    userSchema.findOneAndUpdate({username:user.username},{$push:{viewedPosts:req.body.postId}});
                    postSchema.findOneAndUpdate({postId:req.body.postId},{$inc:{views:1}});
                    res.send(true);
                }
                else {
                    res.send(false);
                }

            }
            else {
                res.send(false);
            }
        }
        else {
            var anonymosIp = requestIp.getClientIp(req);
            redisClient.lrange("anonymosViews::" + anonymosIp, 0, -1, function (err, result) { // 24 hour delete
                if(err) throw err;
                if(result.length > 0){
                    if(result.indexOf(req.body.postId) > -1){
                        res.send(false);
                    }
                    else{
                        if(result.length === 100){
                            redisClient.rpop("anonymosViews::" + anonymosIp);
                        }
                        redisClient.lpush("anonymosViews::" + anonymosIp , req.body.postId); // 24 hour delete
                        redisClient.hincrby("post::"+req.body.postId,"views" , +1,function(err,number){ // cach view numbers
                            if(number === 10){
                                redisClient.hincrby("post::"+req.body.postId,"views",-10);
                                postSchema.update({postId:req.body.postId},{$inc:{views:10}});
                            }
                        });

                    }
                }
            });
        }
    },

    delete: function(req, res,next,data) {
        var id = req.params.id;
        data.splice(id, 1); // Spoof a DB call
        res.json(true);
    }
};


module.exports = posts;