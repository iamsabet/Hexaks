
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var postSchema = require('../models/post.model');
var secret = require('../config/secret');
var post = new postSchema();
var userSchema = require('../models/user.model');
var User = new userSchema();
var albumSchema = require('../models/album.model');
var album = new albumSchema();
var Jimp = require("jimp");
var rateSchema = require('../models/rate.model');
var Rate = new rateSchema();
var viewSchema = require('../models/view.model');
var View = new viewSchema();
var categorySchema = require('../models/category.model');
var Category = new categorySchema();
var deviceSchema = require('../models/device.model');
var Device = new deviceSchema();
var hashtagSchema = require('../models/hashtag.model');
var Hashtag = new hashtagSchema();
var CryptoJS = require("crypto-js");
var Float = require('mongoose-float').loadType(mongoose);
var users = require('./users');
var redis = require("redis");
var requestIp = require("request-ip");
var redisClient = redis.createClient({

});    // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});
// Schaduling Works

var posts = {


    getPostsByFiltersAndOrders: function(req, res,user,userIds,orderBy,isCurated,hashtags,category,curator,rejected,activated,isPrivate,leftCost,rightCost,timeOrigin,timeEdgeIn,counts,pageNumber,albumOrPost) {

        var right = rightCost || 1000000;
        var left = leftCost || 0;
        var orderedBy = orderBy || "createdAt";
        var privateOrNot = isPrivate || false;
        var reject = null;
        if(rejected){
            reject = {$ne:null};
        }
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
                rejected:reject,
                hashtags:hashtagQuery,
                categories:categoryQuery,
                "originalImage.cost":costQuery,
                isPrivate: privateOrNot,
                deleted:false
            };
            if(userIds.length === 1 && user && (userIds[0] === user.userId)){
                query.rejected = {$exists:true};
            }
            if(albumOrPost){
                if(albumOrPost === "album"){
                    query["album.albumId"] = {$ne:null};
                }
                else if(albumOrPost === "post"){
                    query["album.albumId"]  = null;
                }
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

            if (isCurated === true) {
                if(curator !== undefined && curator !== "") {
                    console.log(query);
                    query.curatorId = curator;
                }
                else{
                    console.log(query);
                    query.curatorId = {$ne:""};
                }
            }
            else{
                console.log(isCurated);
                query.curatorId =  {$exists:true};
            }
            let options = {
                select: 'album postId createdAt ownerId mentions fileName number caption largeImage device location views private rejected activated updatedAt hashtags categories exifData originalImage views ext advertise rate curatorId',
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
                    query.createdAt = {$lt: timeOrigin};  // time edge up to 31 days
                }
                else{
                    query.createdAt = {$gte: timeEdge, $lt: timeOrigin};
                }
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
            console.log(query);
            console.log(options);
            post.Paginate(query, options,user,req,res);
        }
    },

    Create: function(user,format,postId,fileName,counts,callback) {
        if (postId) {
            let postObject = {
                album: null,
                postId: postId,
                number : counts,
                ownerId: user.userId,
                ext: format,
                device: null,
                location: null,
                exifData: null, // {}
                originalImage: {
                    cost: -1,
                    resolution: {
                        x: 0,
                        y: 0
                    },
                },
                largeImage: { // yeki beyne 2000 ta 3000 yeki balaye 4000 --> age balaye 4000 bud yekiam miari azash roo 2000 avali bozorge 2vomi kuchike -- > suggest --> half resolution half price .
                    cost: -1,
                    resolution: {
                        x: 0,
                        y: 0
                    },
                },
                fileNames: [fileName.toString()],
                hashtags: [],
                mentions: [],
                tags : [], // {userId :"" , position:{x:num,y:num}} // from relative in view
                ContentTokens: [],
                ContentFullText: "",
                topColors : [], // {colorRange :  number // ( 0-10,11-20,.... 245-255) , abundancePercentage : Float
                categories: [],
                caption: "",
                rate: {
                    value: 0.0,
                    points: 0,
                    counts: 0,
                },
                views: 0,
                curatorId: "",
                isPrivate: false,
                reportsCount : 0,
                rejected: null,
                advertise: null,
                activated: false,
                deleted: false,
            };

            redisClient.get(user.userId+":uploadCounts",function(err,value){
                if(err) throw err;
                if(parseInt(value) < 20){
                postObject.postId = postId + "-" + counts;
                    post.create(postObject, user, function (result) {
                        if (result !== null) {
                            return callback(result);
                        }
                        else {
                            return callback(null);
                        }
                    });
                }
                else {
                    return callback({result:false,message:" Maximum uploads per day reached ! ... "});
                }
            });

        }
    },
    getPostInfo: function(req,res,user,postId){
        if(postId && (typeof postId === "string")) {

            let decryptedPostId = CryptoJS.MD5(postId,secret.postIdKey).toString();
            let postOwnerId = decryptedPostId.split("|-p-|")[0];

            console.log(postOwnerId);
            let options = {
                album: 1, // null if not
                postId: 1,
                number:1,
                ownerId: 1,
                originalImage: 1,
                ext: 1,
                exifData: 1,
                // largeImage:1,
                hashtags: 1,
                device:1,
                location:1,
                mentions: 1,
                generatedHashtags: 1,
                categories: 1,
                caption: 1,
                rate: 1,
                views: 1,    // viewers.length length
                curatorId: 1,
                isPrivate: 1,
                rejected: 1,
                advertise: 1,
                activated: 1,
                createdAt: 1,
                deleted: 1,
                updatedAt: 1
            };
            if (user.userId === postOwnerId) {
                let query = {
                    postId: postId,
                    deleted: false,
                    activated: true
                };
                postSchema.findOne(query, options, function (err, post) {
                    if (err) throw err;
                    if (post) {
                        post.save();
                        rateSchema.find({
                            rater: user.userId,
                            postId: postId,
                            deleted: false,
                            activated: true
                        }, {
                            rateId: 1,
                            changes: 1,
                            rater: 1,
                            postId: 1,
                            value: 1,
                            created: 1
                        }, function (err, ratesx) {
                            if (err) throw err;
                            console.log(ratesx);
                            console.log({
                                rater: user.userId,
                                postId: postId,
                                deleted: false,
                                activated: true
                            });
                            res.send({post: post, rates: ratesx, owner: user});
                        });
                    }
                    else {
                        res.send({result: false, message: "404 - Post not found"});
                    }
                });
            }
            else {
                users.getUserInfosFromCache(postOwnerId,function(info) {
                    if (info.message) {
                        res.send(info);
                    }
                    else{
                        if (user === null) {
                            if (!JSON.parse(info.privacy)) {
                                let query = {
                                    postId: postId,
                                    deleted: false,
                                    rejected: null,
                                    activated: true
                                };
                                postSchema.findOne(query, options, function (err, post) {
                                    if (err) throw err;
                                    if (post) {
                                        res.send({post: post, owner: info});
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
                                    rejected: null,
                                    isPrivate: false,
                                    activated: true
                                }, options, function (err, post) {
                                    if (err) throw err;
                                    if (post) {
                                        res.send({post: post, owner: info});
                                    }
                                    else {
                                        res.send({result: false, message: "404 - Post not found"}); // or private content access denied
                                    }
                                });
                            }
                        }
                        else {
                            if (user.blockList.indexOf(postOwnerId) === -1) {
                                let blockList = {};
                                if (info.blockList !== "") {
                                    blockList = JSON.parse(info.blockList);
                                }
                                else {
                                    blockList = "";
                                }
                                if (blockList === "" || (blockList !== "" && blockList.indexOf(user.userId) === -1)) {
                                    if (JSON.parse(info.privacy)) {
                                        if ((user.followings.indexOf(postOwnerId) > -1) || (user.userId === postOwnerId) || (user.roles.indexOf("superuser") > -1) || (user.roles.indexOf("sabet") > -1) || (user.roles.indexOf("admin") > -1)) {
                                            let query = {
                                                postId: postId,
                                                deleted: false,
                                                rejected: {value: false, reason: ""},
                                                activated: true
                                            };
                                            postSchema.findOne(query, options, function (err, post) {
                                                if (err) throw err;
                                                if (post) {
                                                    post.save();
                                                    rateSchema.find({
                                                        rater: user.userId,
                                                        postId: postId,
                                                        deleted: false,
                                                        activated: true
                                                    }, {
                                                        rateId: 1,
                                                        changes: 1,
                                                        rater: 1,
                                                        postId: 1,
                                                        value: 1,
                                                        created: 1
                                                    }, function (err, ratesx) {
                                                        if (err) throw err;
                                                        console.log(ratesx);
                                                        console.log({
                                                            rater: user.userId,
                                                            postId: postId,
                                                            deleted: false,
                                                            activated: true
                                                        });
                                                        res.send({post: post, rates: ratesx, owner: info});
                                                    });
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
                                                isPrivate: false,
                                                activated: true
                                            }, options, function (err, post) {
                                                if (err) throw err;
                                                if (post) {
                                                    post.save();
                                                    console.log({
                                                        rater: user.userId,
                                                        postId: postId,
                                                        deleted: false,
                                                        activated: true
                                                    });
                                                    rateSchema.find({
                                                        rater: user.userId,
                                                        postId: postId,
                                                        deleted: false,
                                                        activated: true
                                                    }, {
                                                        rateId: 1,
                                                        changes: 1,
                                                        rater: 1,
                                                        postId: 1,
                                                        value: 1,
                                                        created: 1
                                                    }, function (err, ratesx) {
                                                        if (err) throw err;
                                                        console.log(ratesx);
                                                        res.send({post: post, rates: ratesx, owner: info});
                                                    });
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
                                                post.save();
                                                rateSchema.find({
                                                    rater: user.userId,
                                                    postId: postId,
                                                    deleted: false,
                                                    activated: true
                                                }, {
                                                    rateId: 1,
                                                    changes: 1,
                                                    rater: 1,
                                                    postId: 1,
                                                    value: 1,
                                                    created: 1
                                                }, function (err, ratesx) {
                                                    if (err) throw err;
                                                    console.log(ratesx);
                                                    console.log({
                                                        rater: user.userId,
                                                        postId: postId,
                                                        deleted: false,
                                                        activated: true
                                                    });
                                                    res.send({post: post, rates: ratesx, owner: info});
                                                });
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
                });
            }
        }
        else
        {
            res.send({result: false, message: "504 Bad request"});
        }
    },
    activate:function(req,res,user){
        redisClient.get(user.userId+":uploadingPost",function(err,postId){
            if(err) throw err;
                redisClient.get(user.userId+":uploadCounts",function(err,uploadCountsx) {
                    if (err) throw err;
                    let uploadCounts = parseInt(uploadCountsx);
                    let postsList = JSON.parse(req.body["postsList"]);
                    console.log("postsList"+postsList);
                    let keys = Object.keys(postsList);
                    if(!postId || !uploadCounts){
                        res.send({result:false,message:"uploading infos not found in cache"});
                    }
                    else{
                      for(let postsItterator = 0 ; postsItterator < keys.length ; x++){
                        if(postsItterator < 20 && postsList[keys[postsItterator]]) {
                            let now = new Date();
                            let newPostDatas = postsList[keys[postsItterator]];
                            let allCategories = [];
                            let categories = newPostDatas.category || [];
                            for (let c = 0; c < categories.length; c++) { // create categories
                                if (categories[c] && (categories[c] !== undefined)) {
                                    Category.Create(now, 0, categories[c], function (callback) {
                                        console.log("category create callback : " + callback);
                                        if (callback === true) {
                                            if (allCategories.indexOf(categories[c]) === -1)
                                                allCategories.push(categories[c]);
                                            }
                                            else{

                                            }
                                        });
                                  }
                                }
                                // create other things
                                let str2 = postId.split("===.")[0];
                                let rootPostId = str2.slice(0, -2);
                                if ((newPostDatas.privacyList) && (newPostDatas.categories) && (newPostDatas.locations) && (newPostDatas.captions) && (newPostDatas.tags) && (newPostDatas.locations) && (newPostDatas.costs) &&
                                    (typeof newPostDatas.privacyList === "object") && (typeof newPostDatas.categories === "object") && (typeof newPostDatas.costs === "object") && (typeof newPostDatas.captions === "object") && (newPostDatas.costs.length > 0) &&
                                    (newPostDatas.privacyList.length > 0) && (newPostDatas.privacyList.length > 0) && (req.body.categories.length > 0) && (req.body.captions.length > 0)) {
                                    let postIds = [];
                                    let privacyList = newPostDatas.privacyList;
                                    let captions = newPostDatas.captions;
                                    let costs = newPostDatas.costs;
                                    let categories = newPostDatas.categories;
                                    let locations = newPostDatas.locations;
                                    let tags = newPostDatas.tags;
                                    let albumId = newPostDatas.albumId || null;

                                    albumSchema.findOne({
                                        albumId: albumId,
                                        $or: [{ownerId: user.userId}, {collaborators: {$elemMatch: user.userId}}],
                                        activated: true
                                    }, {
                                        counts: 1,
                                        title: 1,
                                        albumId: 1,
                                        isPrivate
                                    }, function (err, albumx) {
                                        if (err) throw err;
                                        let albumPrivacy = false;
                                        if (albumx) {
                                            albumId = albumx.albumId;
                                            albumPrivacy = albumx.isPrivate;
                                        }
                                        else {
                                            albumId = null;
                                        }
                                        console.log("post Id before update post:" + postId.split("===.")[0]);


                                        for (let t = 0; t < uploadCounts; t++) {

                                            let costx = 0;
                                            if (!isNaN(parseInt(costs[t])) && costs[t] > -1 && costs[t] < 1000000) {
                                                costx = costs[t];
                                            }
                                            let str = "";
                                            if (typeof captions[t] === "string" && (captions[t].length > 0)) {
                                                str = captions[t];
                                            }
                                            let category = "";
                                            if (typeof categories[t] === "string" && (categories[t].length > 0)) {
                                                str = categories[t];
                                            }
                                            let privacy = albumPrivacy;

                                            if (!albumPrivacy) {
                                                if (typeof privacyList[t] === "boolean") {
                                                    privacy = privacyList[t];
                                                }
                                            }
                                            let location = null;
                                            if (typeof locations[t] === "string") {
                                                location = locations[t];
                                            }
                                            let tagsList = [];
                                            if (tags[t.toString()] && (typeof tags[t.toString()] === "object")) { // userIds
                                                tagsList = tags[t.toString()]; // json list json["1"] === "list"
                                            }
                                            let hashtags = [];
                                            let mentions = [];
                                            if (str !== "") {


                                                let reHashtag = /(?:^|[ ])#([a-zA-Z]+)/gm;
                                                let reMention = /(?:^|[ ])@([a-zA-Z]+)/gm;
                                                str = str.split("&nbsp;")[0];
                                                let m;
                                                while ((m = reHashtag.exec(str)) != null) {
                                                    if (m.index === reHashtag.lastIndex) {
                                                        reHashtag.lastIndex++;
                                                    }
                                                    if (hashtags.indexOf(m[0].split("#")) === -1) {
                                                        hashtags.push(m[0].split("#")[1]);

                                                    }
                                                }
                                                let n;
                                                while ((n = reMention.exec(str)) != null) {
                                                    if (n.index === reMention.lastIndex) {
                                                        reMention.lastIndex++;
                                                    }
                                                    if (mentions.indexOf(n[0]) === -1) {
                                                        mentions.push(n[0]);
                                                    }
                                                }

                                            }
                                            else {

                                            }

                                            postIds.push(rootPostId + "-" + t);
                                            let postQuery = {
                                                postId: rootPostId + "-" + t,
                                                albumId: null,
                                                activated: false
                                            };


                                            postSchema.update(postQuery, { //// jeezzz
                                                $set: {
                                                    album: albumId,
                                                    activated: true,
                                                    hashtags: hashtags,
                                                    isPrivate: privacy,
                                                    mentions: mentions,
                                                    caption: str || "",
                                                    categories: category,
                                                    location: location,
                                                    tags: tagsList,
                                                    "originalImage.cost": costx// 0 if free // must complete tonight
                                                }
                                            }, function (err, result) {
                                                if (err) throw err;
                                                if (result.n === 1) {
                                                    console.log(postQuery + " updated!");
                                                }
                                                else {
                                                    res.send({
                                                        result: false,
                                                        message: "Oops something went wrong"
                                                    });
                                                }
                                            });

                                            for (let h = 0; h < hashtags.length; h++) {
                                                if ((hashtags[h] !== undefined) && (hashtags[h].length > 2)) {
                                                    console.log("hashes:" + hashtags[h]);
                                                    Hashtag.Create(now, hashtags[h], function (callback) {
                                                        if (callback === true) {
                                                            console.log(hashtags[h] + " : hashtag -> created");
                                                        }
                                                        else {
                                                            callback({
                                                                result: false,
                                                                message: "create hashtag failed"
                                                            });
                                                        }
                                                    });
                                                }
                                            }
                                            for (let t in mentions) {
                                                // push notification to the mentioned user if exists // func()
                                            }
                                            if (postsItterator === 19 || (postsItterator === keys.length -1) {
                                                redisClient.del(user.userId + ":uploadingPost");
                                                redisClient.del(user.userId + ":uploading");
                                                redisClient.del(user.userId + ":uploadCounts");

                                                if (albumId !== null) {
                                                    albumSchema.update({albumId: albumId}, {
                                                        $addToSet: {
                                                            postIds: postId,
                                                        },
                                                        $inc: {counts: 1}
                                                    }, function (err, albums) {
                                                        if (err) throw err;
                                                        if (albums.n === 1) {
                                                            res.send(true);
                                                        }
                                                        else {
                                                            res.send({
                                                                result: false,
                                                                message: "album did not updated"
                                                            });
                                                        }
                                                    });
                                                }
                                                res.send(true);
                                            }
                            }
                        }
                      }
              });
        });
    },
    editPost : function(req,res,user){

        if(req.body && req.body.postId && typeof req.body.postId === "string") {
            let postId = req.body.postId.split("%7C").join("|");
            let postOwnerId = postId.split("|-p-|")[0];

            if(user.userId === postOwnerId || ( user.roles.indexOf("superuser") > -1 ) || (user.roles.indexOf("sabet") > -1)){ // owner access + superuser access

                let change = true;
                let updates = {};
                if(req.body.caption) {
                    let reHashtag = /(?:^|[ ])#([a-zA-Z]+)/gm;
                    let reMention = /(?:^|[ ])@([a-zA-Z]+)/gm;
                    let str = req.body.caption.split("&nbsp;")[0];
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
                        if (n.index === reMention.lastIndex) {
                            reMention.lastIndex++;
                        }
                        if (mentions.indexOf(n[0]) === -1) {
                            mentions.push(n[0]);
                        }
                    }
                    let now = new Date();
                    for (let h = 0 ; h < hashtags.length ; h++) {
                        if((hashtags[h] !==undefined) && (hashtags[h].length > 2)) {
                            console.log("hashes:" + hashtags[h]);
                            Hashtag.Create(now,hashtags[h], function (callback) {
                                if (callback === true) {
                                    console.log(hashtags[h] + " : hashtag -> created");
                                }
                                else {
                                    callback({
                                        result: false,
                                        message: "create hashtag failed"
                                    });
                                }
                            });
                        }
                    }
                    for (let t in mentions) {
                        // push notification to the mentioned user if exists // func()
                    }
                    updates.hashtags = hashtags;
                    updates.mentions = mentions;
                    updates.caption = str;
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
                        postId: postId,
                        ownerId:postOwnerId,
                        activated: true,
                        deleted:false
                    },{
                        $set:updates
                    }, function (err, result) {
                        if (err) throw err;
                        if(result) {
                            res.send({result:true,message:"caption edited successfully",newCaption:req.body.caption});
                        }
                        else{
                            res.send({result:false,message:"Edit caption failed"});
                        }
                    });
                }
                else{
                    res.send({result:false,message:"504 Bad request"});
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
            let postId = req.body.postId.split("%7C").join("|");
            let postOwnerId = postId.split("|-p-|")[0];
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
            let postId = postId.split("%7C").join("|");
            let postOwnerId = postId.split("|-p-|")[0];
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
            let postId = req.body.postId.split("%7C").join("|");
            let postOwnerId = postId.split("|-p-|")[0];
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




    imageProcessing:function(postId,imageUrl){ // image processing on medium size
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
            if(req.body && req.body.postId && typeof req.body.postId === "string" && req.body.value && parseInt(req.body.value) <= 7 && parseInt(req.body.value) >= 1) {
                let postOwnerId = req.body.postId.split("|-p-|")[0];
                if(user.blockList.indexOf(postOwnerId) === -1) {
                    users.getUserInfosFromCache(postOwnerId,function(info) {
                        if (info.message) {
                            res.send(info);
                        }
                        else{
                            let blockList = "";
                            if(info.blockList !== "") {
                                blockList = JSON.parse(info.blockList);
                            }
                            else{
                                blockList = "";
                            }
                            if (blockList === "" || (blockList !== "" && blockList.indexOf(user.userId) === -1)) {
                                postSchema.findOne({postId:req.body.postId},{privacy:1,rate:1},function(err,post){
                                    if(err) throw err;
                                    if(post) {
                                        if (JSON.parse(info.privacy)) {
                                            if (user.followings.indexOf(postOwnerId)) {
                                            // Rate
                                                info.userId = postOwnerId;
                                                posts.doRate(req,res,user,req.body.postId,req.body.value,post,info);
                                            }
                                            else {
                                                res.send({result: false, message: "Cant Rate Private Post"});
                                            }
                                        }
                                        else {
                                            // Rate
                                            info.userId = postOwnerId;
                                            posts.doRate(req,res,user,req.body.postId,req.body.value,post,info);
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
    doRate:function(req,res,user,postId,rateNumber,post,hostUser){
        rateSchema.findOne({rater:user.userId,postId:req.body.postId},{rateId:1,changes:1,rater:1,postId:1,value:1},function(err,ratex) {
            if (err) throw err;
            let rateObject = {};
            if (ratex) {
                if(ratex.changes < 4) {
                    ratex.save();
                    let now = Date.now();
                    rateSchema.update({rateId:ratex.rateId},{
                        $set:{
                            value:rateNumber,
                            changes : ratex.changes+1,
                            updatedAt : now
                        },
                    },function(err,result){
                        if(err) res.send({result:false,message:"Update rate object failed + err"});
                        if(result.n > 0){

                            let smallImageUrl = "../pictures/"+postId + "-Small===.";
                            if(info.gender)

                            users.pushNotification("environment","Changed rate post "+ rateNumber,hostUser.userId,user.userId,postId,"/post/"+postId,"",smallImageUrl,now);

                            let diff = 0.0;
                            let points = 0.0;
                            if(parseFloat(rateNumber) > parseFloat(ratex.value)) {
                                diff = parseFloat(parseFloat(rateNumber) - parseFloat(ratex.value));
                                points = parseFloat(parseFloat(post.rate.points) + parseFloat(diff));
                            }
                            else {
                                diff = parseFloat(parseFloat(ratex.value) - parseFloat(rateNumber));
                                points = parseFloat(parseFloat(post.rate.points) - parseFloat(diff));
                            }
                            console.log(diff);
                            console.log(points);
                            let value = parseFloat(parseFloat(points)/ parseFloat(post.rate.counts));
                            console.log(value);
                            post.save();
                            posts.updatePostRates(req,res,{postId:ratex.postId},{
                                $set:{
                                    rate:{
                                        points : points,
                                        value : value,
                                        count : post.rate.counts,
                                    }
                                }
                            },value.toString()+"/update");
                        }
                        else{
                            res.send({result:false,message:"Update rate object failed"});
                        }
                    });
                }
                else{
                    res.send({result:false,message:"Maximum changes for a Rate reached! please try no more"});
                }
            }
            else {
                rateObject.rater = user.userId;
                rateObject.value = rateNumber;
                rateObject.changes = 0;
                rateObject.postId = postId;
                post.save();
                Rate.Create(rateObject,function(callback){
                   if(callback){
                       let counts = parseInt(post.rate.counts) + 1 ;
                       let points = (parseFloat(post.rate.points) + parseFloat(rateNumber));
                       let value = points / counts;
                       let smallImageUrl = "../pictures/"+postId + "-Small===.";
                       users.pushNotification("environment"," Rated your post "+ rateNumber,hostUser.userId,user.userId,postId,"/post/"+postId,"",smallImageUrl,function(resultx){
                           console.log(" xxxxxxxxxx unread notifications after create " + resultx);
                       });
                       posts.updatePostRates(req,res,{postId:rateObject.postId},{
                           $set:{
                               rate:{
                                   points : points,
                                   value : value,
                                   counts:counts
                               }
                           }
                       },value.toString()+"/new");
                   }
                   else{
                       res.send({result:false,message:"Rate Object Did not Created"});
                   }
                });

            }
        });
    },
    updatePostRates:function(req,res,query,updates,value){
        postSchema.update(query,updates,function(err,result){

            if(err) throw err;
            if(result.n > 0){
                res.send(value);
            }
            else{
                res.send({result:false,message:"post rate values failed to update"});
            }
        });
    },
    view:function(req,res,user) { // caching for later
        if(user) {
            if(req.body && req.body.postId && typeof req.body.postId === "string") {
                let postOwnerId = req.body.postId.split("|-p-|")[0];
                if(user.blockList.indexOf(postOwnerId) === -1) {
                    users.getUserInfosFromCache(postOwnerId,function(info) {
                        if (info.message) {
                            res.send(info);
                        }
                        else{
                            let blockList = "";
                            if(info.blockList !== "") {
                                blockList = JSON.parse(info.blockList);
                            }
                            else{
                                blockList = "";
                            }
                            if (blockList === "" || (blockList !== "" && blockList.indexOf(user.userId) === -1)) {
                                postSchema.find({postId:req.body.postId},{isPrivate:1,views:1},function(err,postx){
                                    if(err) throw err;
                                    var viewObject = {
                                        postId: req.body.postId,
                                        viewer : user.userId
                                    };
                                    console.log(viewObject);
                                    if(postx) {
                                        if (JSON.parse(info.privacy)) {
                                            if (user.followings.indexOf(postOwnerId)) {
                                                // View
                                                viewSchema.findOne({viewer:user.userId,postId:req.body.postId,deleted:false},{viewer:1,deleted:1},function(err,viewx) {
                                                    if (err) throw err;

                                                    if (!viewx) {
                                                        View.Create({viewer:user.userId,postId:req.body.postId,deleted:false}, function (callback) {
                                                            if (callback === true) {
                                                                postx.save();
                                                                posts.increasePostViews(req, res, req.body.postId);
                                                            }
                                                        });
                                                    }
                                                    else{
                                                        res.send({result:true,message:"already viewed"});
                                                    }
                                                });
                                            }
                                            else {

                                                res.send({result: false, message: "Cant view Private Post"});
                                            }
                                        }
                                        else {
                                            // View
                                            viewSchema.findOne({viewer:user.userId,postId:req.body.postId,deleted:false},{viewer:1,deleted:1},function(err,viewx) {
                                                if (err) throw err;
                                                if (!viewx) {
                                                    View.Create({viewer:user.userId,postId:req.body.postId,deleted:false}, function (callback) {
                                                        if (callback === true) {
                                                            posts.increasePostViews(req, res, req.body.postId);
                                                        }
                                                    });
                                                }
                                                else{
                                                    res.send({result:true,message:"already viewed"});
                                                }
                                            });
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
            // lets do it some other time later for not authenticated persons
            res.send({result:false,message:"Not Authenticated user views does not count right now"});
        }
    },
    increasePostViews(req,res,postId){
        postSchema.update({postId:postId,activated:true,"rejected":null,deleted:false},{
            $inc: {
                views: 1
            }
        },function(err,result){
            if(err) throw err;
            console.log(result);
            if(result.n > 0){
                res.send(true);
            }
            else{
                res.send({result:true,message:"post view values failed to update"});
            }
        });
    },
    report:function(req,res,user){
        if(user) {
            if(req.body && req.body.postId && typeof req.body.postId === "string" && req.body.reportId){
                let postOwnerId = req.body.postId.split("|-p-|")[0];
                users.getUserInfosFromCache(postOwnerId,function(info) {
                    if (info.message) {
                        res.send(info);
                    }
                    else{
                        if(info.blockList.indexOf(user.userId) === -1){
                            // create a report
                        }
                        else{
                            res.send({result: false, message: "the post owner has blocked you"});
                        }
                    }
                });
            }
        }
    },
};


module.exports = posts;
