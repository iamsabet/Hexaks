const mongoose = require('mongoose');

var postSchema = require('../models/post.model');
var post = new postSchema();
var albumSchema = require('../models/album.model');
var album = new albumSchema();
var Jimp = require("jimp");
var pixelSchema = require('../models/pixel.model');
var pixels = mongoose.model("pixels");
var pixel = new pixelSchema();
var rateSchema = mongoose.model("rates");
var rate = new rateSchema();
var bcrypt = require("bcrypt-nodejs");
var ExifImage = require('exif').ExifImage;
var Float = require('mongoose-float').loadType(mongoose);


/* GET home page. */
var posts = {

    getAll: function(req, res,data) {
        var allusers = data; // Spoof a DB call
        res.json(allusers);
    },

    getOne: function(req, res,user,postId,callback) {
        postSchema.findOne({postId:postId},function(err,posts) {
            if (err) throw err;
            if(posts){
                return callback(posts);
            }
            else{
                return callback(null);
            }
        });

    },

    create: function(user,format,callback) {

        if(user.isUploadingPost === true){
            postSchema.findOne({postId:user.uploadingPost,owner:{username:user.username}},function(err,findPost){
                if(err) throw err;
                if(!posts){
                    try {
                        new ExifImage({ image : '../Pictures/Originals/'+user.uploadingPost+user.uploadingExt }, function (error, exifData) {
                            if (error)
                                console.log('Error: '+error.message);
                            else {
                                console.log(exifData); // Do something with your data!



                                var postObject = {
                                    albumId: "", // null if not
                                    postId: user.uploadingPost,
                                    owner: {
                                        username: user.username,
                                        profilePicUrl: user.profilePictureUrl,
                                    },
                                    ext: format,
                                    originalImage: { // yeki beyne 2000 ta 3000 yeki balaye 4000 --> age balaye 4000 bud yekiam miari azash roo 2000 avali bozorge 2vomi kuchike -- > suggest --> half resolution half price .
                                        cost: 0, // 0 if free
                                        resolution: {
                                            x: x,
                                            y: y,
                                        },
                                    },
                                    buyers: [], // user id
                                    hashtags: [],
                                    category:"",
                                    caption:"",
                                    rate: {
                                        value: 0.0,
                                        counts: 0,
                                    },
                                    views:0,
                                    viewers: [],// usernames // length
                                    curator: {
                                        username: "",
                                        profilePicUrl: "",
                                    },
                                    private: false,
                                    rejected : {
                                        value: false,
                                        reason : "",
                                    },
                                    advertise:{},
                                    activated: false,
                                };
                                post.create(postObject,function(result){
                                    if(result !== null){
                                        callback(result);
                                    }
                                    else {
                                        return callback(null);
                                    }

                                });

                            }
                        });
                    } catch (error) {
                        console.log('Error: ' + error.message);
                    }
                }
                else{
                    callback(findPost.postId);
                }
            });
        }



    },

        //         Jimp.read("../Private Files/x-large/"+Storage.filename(req,req.body.file),function (err, image) {

        //                 image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        //                     // x, y is the position of this pixel on the image
        //                     // idx is the position start position of this rgba tuple in the bitmap Buffer
        //                     // this is the image
        //                     var red = this.bitmap.data[idx];
        //                     var green = this.bitmap.data[idx + 1];
        //                     var blue = this.bitmap.data[idx + 2];
        //                     var alpha = this.bitmap.data[idx + 3];
        //                     gatheredPixels.push({postId: postId, position: idx, value: {r: red, g: green, b: blue, a: alpha}});
        //                     // gather list of pixels --> insert many
        //                     // rgba values run from 0 - 255
        //                     // e.g. this.bitmap.data[idx] = 0; // removes red from this pixel
        //                 }, function (cb) {
        //                     pixels.collection.insertMany(gatheredPixels, [{
        //                             ordered: true,
        //                             rawResult: false
        //                         }],
        //                         function () {
        //                             console.log(gatheredPixels.length + " inserted pixels");
        //                         });
        //
        //                 });
        //
        //             }
        //         });
        //     }
        // });
    activate:function(req,res,user){
        postSchema.findOne({postId:user.isUploadingPost},{albumId:0},function(err,resultPost){
                if(err) throw err;
                if(resultPost){
                    resultPost.activated = true;
                    user.isUploadingPost=false;
                    user.uploadingPost="";
                    resultPost.hashtags = req.body["hashtags"];
                    resultPost.hashtags = req.body["caption"];
                    resultPost.hashtags = req.body["hashtags"];
                    user.save();
                    resultPost.save();
                    // another thread if necessary
                    posts.imageProcessing(resultPost.postId+"--medium"+"."+resultPost.format);
                    res.send(true);
                }
                else{
                    res.send("no post found to add");
                }
        });
        user.save();
    },
    imageProcessing(imageUrl){ // image processing on medium size


    },
    increaseViews:function(req,res,user){
        if(user) {
            postSchema.findOne({postId: req.body["postId"]}, {albumId: 0}, function (err, resultPost) {
                if (err) throw err;
                if (!resultPost.viewers.includes(user.username)) {
                    resultPost.viewers.push(user.username);
                    resultPost.views += 1;
                    resultPost.save();
                    res.send(true);
                }
                else {
                    res.send(false);
                }

            });
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
                    rateSchema.updateOne({
                        postId: postId,
                        value: rate
                    }, {$push: {members: user.username}}, function (err, resultRate) {
                        if (err) throw err;
                        console.log(resultRate);
                        postSchema.findOne({postId: postId}, {albumId: 0}, function (err, resultPost) {
                            if (err) throw err;
                            if (resultPost) {
                                if (resultPost.rate.value >= rate) {
                                    if (resultPost.rate.value !== rate) {
                                        resultPost.rate.value += Float((resusltPost.rate.value - rate) / (resultPost.rate.counts + 1));
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
                                res.send("post not found");
                            }
                        });
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
    deRate:function(req,res,user){
        if(req.body["postId"]) {
            var postId = req.body["postId"];
            if (user) {
                if (err) throw err;
                    rateSchema.findOne({
                        postId: postId,
                        members:[user.username]
                    }, function (err, resultRate) {
                        if (err) throw err;
                        if(resultRate) {
                            postSchema.findOne({postId: postId}, {albumId: 0}, function (err, resultPost) {
                                if (err) throw err;
                                if (resultPost) {
                                    resultPost.rate.value += Float((resusltPost.rate.value * resultRate.rate.counts) - resultRate.value / (resultRate.rate.counts + 1));
                                    console.log(resultPost.rate.value);
                                    resultPost.rate.counts -= 1;
                                    resultPost.save();

                                    resultRate.members.pull(user.username);
                                    resultRate.save();
                                    res.send(true);
                                }
                                else {
                                    res.send("post not found");
                                }
                            });
                        }
                        else{
                            res.send("no rate found to derate");
                        }
                    });
                }
            else {
                res.send("401 - not authenticated"); //
            }
        }
        else {
            res.send("invalid input");
        }
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


module.exports = posts;