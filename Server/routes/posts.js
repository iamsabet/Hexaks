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

    getPostsByFiltersAndOrders: function(req, res,user,userNames,orderBy,isCurated,hashtags,category,curator,rejected,activated,isPrivate,leftCost,rightCost,timeOrigin,counts,pageNumber,callback) {


        var right = rightCost || 1000000;
        var left = leftCost || -1;
        var orderedBy = orderBy || "createdAt";
        var privateOrNot = isPrivate || "";
        var reject = rejected || false;
        var hashtags = hashtags || [];
        var category = category || "";
        var timeEdge = 1;

        if (orderedBy === "createdAt" || orderedBy === "originalImage.cost" || orderedBy === "rate.value" || orderedBy === "views" || orderedBy === "rate") {
            // timeWindow
            if ((typeof isCurated) === "boolean") {
                if (timeEdge < 31 && timeEdge > 1) {
                    timeEdge = (timeOrigin - (timeEdge * 24 * 3600 * 1000)); // time edge up to 31 days
                }
                else {
                    timeEdge = (timeOrigin - (24 * 3600 * 1000)); // 1day
                }
                var query = {
                    owner: {username: userNames},
                    activated: activated,
                    rejected: reject,
                    hashtags:{$in:hashtags},
                    category:category,
                    originalImage: {cost: {$gt: left, $lt: right}},
                    isPrivate: privateOrNot,
                    createdAt: {$lt: timeEdge},
                };
                if (isCurated === true) {
                    query.isCurated = true;
                    query.curator = {
                        username: curator
                    };
                }
                var options = {
                    select: 'postId owner createdAt updatedAt curator exifData originalImage views isCurated ext advertise rate albumId',
                    sort: {date: -1},
                    populate: 'postId',
                    lean: true, // no fucking idea what this is exactly :/ / - laghar :/ :))
                    page: pageNumber,
                    limit: counts
                };

                if (orderBy === "originalImage.cost") {
                    options.sort = {originalImage: {cost: -1}};
                }
                else if (orderBy === "rate.value") {
                    options.sort = {rate: {value: -1}};
                }
                else if (orderBy === "rate") {
                    options.sort = {rate: -1};
                }
                else { // "views"
                    options.sort = {views: -1};
                }

                postSchema.paginate(query, options, function (err, posts) {
                    if (err) throw err;
                    return callback(posts);
                });
            }
        }
    },

    Create: function(user,format,postId,callback) {
        redisClient.get(user.username+"::uploadingPost",function(err,postId) {
            if (err) throw err;
            if (postId) {
                var postObject = {
                    postId: postId.split(".")[0],
                    owner: {
                        username: user.username,
                        profilePicUrl: user.profilePictureUrl || "avatar.png",
                    },
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
                    advertise: {},
                    activated: false,
                };
                post.create(postObject, function (result) {
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
        });
    },



    activate:function(req,res,user){
        redisClient.get(user.username+"::uploadingPost",function(err,postId){
            if(err) throw err;
            if(postId) {
                try {
                    new ExifImage({image: 'Server/Pictures/' + postId}, function (error, exifData) {
                        if (error)
                            console.log('Error: ' + error.message);
                        else {
                            redisClient.del(user.username+"::uploadingPost");
                            redisClient.del(user.username+"::isUploadingPost");
                            console.log(exifData);
                            postSchema.findOneAndUpdate({
                                owner: {username: user.username},
                                postId:postId.split(".")[0]
                            }, {$set: {activated: true},hashtags:req.body["hashtags"] || [],caption:req.body["caption"] || []}, function (err, resultPost) { // destroy redis-chashes
                                if (err) throw err;
                                if (resultPost) {
                                    var cost = req.body["cost"] || 0;
                                    if (cost < 1000000 && cost >= 0) {
                                        resultPost.activated = true;
                                        user.isUploadingPost = false;
                                        user.uploadingPost = "";

                                        // exif get resoloution //
                                        resultPost.originalImage = {
                                            cost: cost, // 0 if free
                                            resolution: {
                                                x: width,
                                                y: height,
                                            }
                                        };
                                        resultPost.save();
                                        posts.imageProcessing(resultPost.postId + "--Medium." + resultPost.format);
                                        res.send(true);
                                    }
                                    else {
                                        res.send("invalid cost");
                                    }
                                }
                                else {
                                    res.send("no post found to add");
                                }
                            });
                        }
                    });
                }
                catch(err){
                    res.send({result:false,message:"Image processing failed!" + err});
                }
            }
            else{
                res.send({result:false,message:"No post found to activate"});
            }
        });
    },

    imageProcessing:function(imageUrl){ // image processing on medium size

        Jimp.read("../Private Files/x-large/"+Storage.filename(req,req.body.file),function (err, image) {

                image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
                    // x, y is the position of this pixel on the image
                    // idx is the position start position of this rgba tuple in the bitmap Buffer
                    // this is the image
                    var red = this.bitmap.data[idx];
                    var green = this.bitmap.data[idx + 1];
                    var blue = this.bitmap.data[idx + 2];
                    var alpha = this.bitmap.data[idx + 3];
                    gatheredPixels.push({postId: postId, position: idx, value: {r: red, g: green, b: blue, a: alpha}});
                    // gather list of pixels --> insert many
                    // rgba values run from 0 - 255
                    // e.g. this.bitmap.data[idx] = 0; // removes red from this pixel
                }, function (cb) {
                    pixels.collection.insertMany(gatheredPixels, [{
                            ordered: true,
                            rawResult: false
                        }],
                        function () {
                            console.log(gatheredPixels.length + " inserted pixels");
                        });

                });

            });
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