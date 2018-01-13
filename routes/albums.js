const mongoose = require('mongoose');
var postSchema = require('../models/post.model');
var post = new postSchema();
var Jimp = require("jimp");
var albumSchema = require('../models/album.model');
var album = new albumSchema();
var postSchema = mongoose.model("pixels");
var posts = new postSchema();
var bcrypt = require("bcrypt-nodejs");
var randomString = require("randomstring");
/* GET home page. */
var albums = {

    getAll: function(req, res,user) {
        var allusers = data; // Spoof a DB call
        res.json(allusers);
    },

    getOne: function(req, res,next,user) {
        var id = req.params.id;
        var user = data[0]; // Spoof a DB call
        res.json(user);
    },
    addPost: function(req, res,user,albumId,postId) {

        postSchema.updateOne({postId:postId},{$set:{albumId:user.uploadingAlbum}},function(err,result) {
            if (err) throw err;
            if (albume) {
                console.log(result);
            }
        });
    },
    create: function(req,res,user,callback) {
        var albumId = randomString.generate(20);
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