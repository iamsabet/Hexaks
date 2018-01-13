const mongoose = require('mongoose');
var postSchema = require('../models/post.model');
var post = new postSchema();
var Jimp = require("jimp");
var pixelSchema = require('../models/pixel.model');
var pixels = mongoose.model("pixels");
var pixel = new pixelSchema();
var bcrypt = require("bcrypt-nodejs");

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

    create: function(req,res,user,fileName,albumId,callback) {

        var postId = bcrypt(fileName+Date.now().toString())+"."+fileName.split(".")[fileName.split(".").length-1];
        postSchema.findOne({postId:postId},function(err,posts){
            if(err) {
                res.send({result: false, message: "Oops Something went wrong - please try again"});
            }
            if(posts){
                res.send({result:false,message:"user with username -> "+req.body["username"]+" already exists"});
            }
            else {

                var postObject = {


                };
                if(albumId){
                    postObject.albumId = albumId;
                }
                posts.create(postObject,function(postId){
                    return callback(postId);
                })

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


module.exports = posts;