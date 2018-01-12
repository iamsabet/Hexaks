const mongoose = require('mongoose');
var postSchema = require('../models/post.model');
var post = new postSchema();
var Jimp = require("jimp");
var pixelSchema = require('../models/pixel.model');
var pixels = mongoose.model("pixels");
var pixel = new pixelSchema();
var multer = require('multer');
var upload   =  multer( { dest: '../Private Files/x-large/' } );
var random = require("randomstring");
var cpUpload = upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'gallery', maxCount: 8 }])
/* GET home page. */
var posts = {

    getAll: function(req, res,data) {
        var allusers = data; // Spoof a DB call
        res.json(allusers);
    },

    getOne: function(req, res,next,data) {
        var id = req.params.id;
        var user = data[0]; // Spoof a DB call
        res.json(user);
    },

    create: function(req,res,user) {
        console.log(user);
        upload.single('file',function() {
            if (!req.file.mimetype.startsWith('image/')) {
                return res.status(422).json({
                    error: 'The uploaded file must be an image'
                });
            }

            var dimensions = sizeOf(req.file.path);

            if ((dimensions.width < 640) || (dimensions.height < 480)) {
                return res.status(422).json({
                    error: 'The image must be at least 640 x 480px'
                });
            }

            return res.status(200).send(req.file);
        });



        // upload(req, res, function(err) {
        //     if (err) {
        //         return res.end("Something went wrong!");
        //     }
        //     else{
        //         var postId = random.generate(16);
        //         console.log(postId);
        //         var postObject = {
        //             albumId:"",
        //             postId : postId,
        //             owner : {
        //                 username : user.username,
        //                 profilePicUrl : user.profilePictureUrl,
        //             },
        //             products: [],
        //             hashtags:req.body["hashtags"],
        //             category:req.body["category"],
        //             caption:req.body["caption"],
        //             rate:{
        //                 number:0.0,
        //                 counts: 0,
        //             },
        //             viewers : [],// usernames // length
        //             curator : {
        //                 username:"",
        //                 profilePicUrl:"",
        //             }
        //         };
        //
        //         var gatheredPixels = [];
        //         // Original Size --> ../../Private Files/pictures/x-large
        //         // We Must Pass the File name through multer to here ... to use resizing
        //         Jimp.read("../Private Files/x-large/"+Storage.filename(req,req.body.file),function (err, image) {
        //             if (err) throw err;
        //
        //             postObject.products.push({ // yeki beyne 2000 ta 3000 yeki balaye 4000 --> age balaye 4000 bud yekiam miari azash roo 2000 avali bozorge 2vomi kuchike -- > suggest --> half resolution half price .
        //                 cost:0,
        //                 resolution:{
        //                     x : image.bitmap.width,
        //                     y : image.bitmap.height,
        //                 },
        //             });
        //
        //             if(image.bitmap.width > image.bitmap.height) {
        //                 image.resize(600, Jimp.AUTO)
        //                     .quality(100)
        //                     .exifRotate()// set JPEG quality // SMALL
        //                     .write("../../Static Files/pictures/small/cafe.jpg"); // save // image URL
        //
        //
        //                 image.scaleToFit(1600, Jimp.AUTO)
        //                     .quality(70)
        //                     .blur(50)// set JPEG quality
        //                     .write("../../Static Files/pictures/medium/cafe.jpg"); // save // image URL
        //
        //                 if(image.bitmap.width > 6000) {
        //                     image.scaleToFit(3200, Jimp.AUTO)
        //                         .quality(100)                 // set JPEG quality
        //                         .write("../../Private Files/pictures/large/cafe.jpg"); // save // image URL
        //
        //                     var scale  = image.bitmap.width / 2000  ;
        //                     postObject.products.push({ // yeki beyne 2000 ta 3000 yeki balaye 4000 --> age balaye 4000 bud yekiam miari azash roo 2000 avali bozorge 2vomi kuchike -- > suggest --> half resolution half price .
        //                         cost:0,
        //                         resolution:{
        //                             x : 2000,
        //                             y : image.bitmap.height / scale,
        //                         },
        //                     });
        //
        //                 }
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
        //             }
        //             else{
        //
        //                 image.resize(Jimp.AUTO,600)
        //                     .quality(50)
        //                     .exifRotate()// set JPEG quality // SMALL
        //                     .write("../../Static Files/pictures/small/cafe.jpg"); // save // image URL
        //
        //
        //                 image.resize(Jimp.AUTO,1600)
        //                     .quality(70)                 // set JPEG quality
        //                     .write("../../Static Files/pictures/medium/cafe.jpg"); // save // image URL
        //
        //                 if(image.bitmap.height > 6000) {
        //                     image.resize(Jimp.AUTO, 2000)
        //                         .quality(100)                 // set JPEG quality
        //                         .write("../../Private Files/pictures/large/cafe.jpg"); // save // image URL
        //
        //                     var scale  = image.bitmap.height / 2000  ;
        //                     postObject.products.push({ // yeki beyne 2000 ta 3000 yeki balaye 4000 --> age balaye 4000 bud yekiam miari azash roo 2000 avali bozorge 2vomi kuchike -- > suggest --> half resolution half price .
        //                         cost:0,
        //                         resolution:{
        //                             x : image.bitmap.width / scale,
        //                             y : 2000,
        //                         },
        //                     });
        //
        //                 }
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