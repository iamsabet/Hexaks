const mongoose = require('mongoose');

var postSchema = require('../models/post.model');
var post = new postSchema();
var albumSchema = require('../models/album.model');
var album = new albumSchema();
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

    create: function(req,res,user,callback) {

        var postId = bcrypt("alo salam sabiam"+Date.now()+" chetori ? <3");



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

    addNewPost:function(req,res,user){

    },
    delete: function(req, res,next,data) {
        var id = req.params.id;
        data.splice(id, 1); // Spoof a DB call
        res.json(true);
    }
};


module.exports = posts;