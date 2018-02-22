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

    getCommentsPaginated: function(req, res,user,postId) {



        console.log("KIRRRR" + isCurated);
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
            var usernames = {$in:userNames};
            if(userNames==="All"){
                usernames = {$exists:true}
            }
            console.log(userNames);
            let query = {
                "owner.username" : usernames,
                activated: activated || true,
                "rejected.value":reject,
                hashtags:hashtagQuery,
                categories:categoryQuery,
                originalImage: costQuery,
                private: privateOrNot,
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
            if(userNames === "all"){
                query["owner.username"]= {$exists:true};
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
        redisClient.get(user.username+"::uploadingPost",function(err,postId) {
            if (err) throw err;
            if (postId) {
                let postObject = {
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
                    isCurated : false,
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
    }

    delete: function(req, res,next,data) {
        var id = req.params.id;
        data.splice(id, 1); // Spoof a DB call
        res.json(true);
    }
};


module.exports = posts;