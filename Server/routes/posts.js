
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
// var categorySchema = require('../models/category.model');

var categories = require('./categories');
var deviceSchema = require('../models/device.model');
var Device = new deviceSchema();
var hashtagSchema = require('../models/hashtag.model');
var Hashtag = new hashtagSchema();
var CryptoJS = require("crypto-js");
var Float = require('mongoose-float').loadType(mongoose);
var users = require('./users');
var albums = require('./albums');
var blocks = require('./blocks');
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
            if(hashtags[0] && hashtags[0] !== "")
                hashtagQuery = {$in:hashtags};
        }
        if(category && category.length > 0){
            if(category[0] !== "" && category[0] !== "All")
                categoryQuery = {$in:category};
        }
        let timeEdge = parseInt(timeEdgeIn);
        if (orderedBy === "createdAt"|| orderedBy === "updatedAt" || orderedBy === "originalImage.cost" || orderedBy === "rate.number" || orderedBy === "rate.value" ||  orderedBy === "rate"  || orderedBy === "views") {
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
            let notIncludeThese = [];
            if(userIds ==="all"){
                if((user) && (!user.message) && (user.blockList.length > 0)) {
                    notIncludeThese = user.blockList;
                    userId = {$nin: notIncludeThese};
                }
                else{
                    userId = {$exists: true}
                }
            }
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
                    query["album"] = {$ne:null};
                }
                else if(albumOrPost === "post"){
                    query["album"]  = null;
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

            if (JSON.parse(isCurated) === true) {
                if(curator !== undefined && curator !== "") {
                    query.curatorId = curator;
                }
                else{
                    query.curatorId = {$ne:""};
                }
            }
            else{
                query.curatorId =  {$exists:true};
            }
            let options = {
                select: 'album postId createdAt ownerId mentions fileName caption largeImage device location gps views isPrivate rejected activated updatedAt hashtags categories exifData originalImage ext advertise rate curatorId',
                sort: {createdAt: -1},
                page: parseInt(pageNumber),
                limit: parseInt(counts)
            };
            if (orderedBy === "originalImage.cost") {
                options.sort = {"originalImage.cost": -1};
            }
            else if (orderedBy === "rate.value" || orderedBy === "rate") {
                options.sort = {"rate.value" : -1};
            }
            else if (orderedBy === "rate.number") {
                options.sort = {"rate.number": -1};
            }
            else if(orderedBy === "views"){ // "views"
                options.sort = {views: -1};
            }
            else if(orderedBy === "updatedAt"){ // "views"
                options.sort = {updatedAt: -1};
            }
            else{
                options.sort = {createdAt: -1};
            }
            let inputx = null;
            if(!user.message)
                inputx = user.userId;
            if(userIds === "all"){
                blocks.getUserBlockers(inputx,function(blockers){
                    if(!user.message){
                        notIncludeThese.push.apply(notIncludeThese,blockers);
                        if(notIncludeThese.length>0){
                            userId = {$nin: notIncludeThese};
                        }
                        else{
                            query.ownerId= {$exists:true};
                        }
                    }
                    else{
                        query.ownerId= {$exists:true};
                    }
                    posts.paginate(query,options,user,res);
                });
            }
            else{
                if(userIds.length === 1) { // profile
                    timeEdge = (timeOrigin - (120 * 744 * 3600 * 1000)); // 31 days
                    query.createdAt = {$lt: timeOrigin};  // time edge up to 31 days
                }
                else{ // followings or followers 
                    query.createdAt = {$gte: timeEdge, $lt: timeOrigin};
                }
                posts.paginate(query,options,user,res);
            }
        
        }
    },

    paginate:function(query,options,user,res){
        post.Paginate(query, options,user,function(postsList){
            if(postsList){
                postsList.owners = {};
                postsList.rates = [];
                if(postsList.docs.length > 0) {
                    let postIds = [];
                    for (let x = 0; x < postsList.docs.length; x++) {
                        users.getUserInfosFromCache(postsList.docs[x].ownerId,function(info){
                            if (!info.message){ 
                                if(!postsList.owners[postsList.docs[x].ownerId]){
                                    // delete secure and unneccesary datas
                                    postsList.owners[postsList.docs[x].ownerId] = info;
                                }
                            }
                            else {
                                console.log("User not found in cache in paginate posts");
                            }
                            postIds.push(postsList.docs[x].postId);
                            if (x === postsList.docs.length - 1) {
                                if(user){
                                    rateSchema.find({postId:{$in:postIds},rater:user.userId,deleted:false,activated:true},{value:1,changes:1,rateId:1,postId:1},function(err,rates){
                                        if(err) throw err;
                                        postsList.rates = JSON.stringify(rates);
                                        res.send(postsList);
                                    });
                                }
                                else{
                                    res.send(postsList);
                                }
                            }
                        });
                        
                    }
                }
                else{
                    res.send({docs:[],total:0});
                }
            }
            else{
                res.send(postsList);
            }
        });
    },

    Create: function(user,format,postId,fileName,counts,callback) {
        if (postId) {
            let postObject = {
                album: null,
                postId: postId+"-"+counts,
                ownerId: user.userId,
                ext: format,
                device: null,
                location: null,
                gps:null,
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
                fileName: fileName.toString(),
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
                    number: 0.0,
                    counts: 0,
                    points: 0
                },
                views: 0,
                curatorId: "",
                isPrivate: false,
                reportsCount : 0,
                rejected: null,
                advertise: null,
                activated: false,
                deleted: false
            };
 
                post.create(postObject, user, function (result) {
                if (result !== null) {
                    return callback(result);
                }
                else {
                    return callback(null);
                }
            });
                

        }
    },
    getPostInfoById : function(postId,privacy,callback){

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

        let query = {
            postId: postId,
            deleted: false,
            activated: true,
            isPrivate:{"$exists":true}
        };
        if(privacy === false){
            query.isPrivate = false;
        }
        postSchema.findOne(query, options, function (err, post) {
            if (err)
                throw err;
            else 
                callback(post);
        });
    },
    accessPostDatas : function(user,postId,owner,privacy,res,query){

        posts.getPostInfoById(postId,privacy,function(post){
            if(post){
                if(user){
                    rateSchema.findOne({
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
                        createdAt: 1
                    }, function (err, ratex) {
                        if (err) throw err;
                        else{
                            res.send({post: post, rate: ratex, owner: owner}); // extra detail must delete from cache unnecessaries i mean :/
                        }
                    });
                }
                else{
                    res.send({post: post, owner: owner});
                }
            }
            else {
                res.send({result: false, message: "404 - Post not found"});
            }
        });
    },
    getPostInfo: function(req,res,user,postId){
        if(postId && (typeof postId === "string")) {
            let postOwnerId = posts.getPostOwnerIdByDecrypt(postId);
            users.getUserIdFromCache(postOwnerId,function(hostUser){
                if(hostUser.message){
                    res.send(hostUser);// message + result 
                }
                else{
                    if(user){
                        if(user.followings.indexOf(postOwnerId) > -1){
                            posts.accessPostDatas(user,postId,hostUser,true,res); // ( postId,owner,privacy,res)
                        }
                        else {
                            if(user.blockList.indexOf(postOwnerId)>-1){
                                res.send({result:false,message:"You Have Blocked Post Owner"});
                            }
                            else{
                                blocks.check(postOwnerId,user.userId,function(resultb){
                                    if(resultb){
                                        res.send({result:false,message:"You Have Been Blocked By The Post Owner"});
                                    }
                                    else{
                                        posts.accessPostDatas(user,postId,hostUser,!hostUser.privacy,res); // not following and not block situation // 
                                    }
                                });
                            }

                        }
                    }
                    else{
                        posts.accessPostDatas({},postId,hostUser,!hostUser.privacy,res); // bypass post Privlidge in 2 ways
                    }
                }
            });
        }
        else
        {
            res.send({result: false, message: "504 Bad request"});
        }
    },
    activate:function(req,res,user){

        redisClient.get("uploadingPost:"+user.userId,function(err,postId){
            if(err) throw err;
                redisClient.get("uploadCounts:"+user.userId,function(err,uploadCountsx) {
                    if (err) throw err;
                    let uploadCounts = parseInt(uploadCountsx);
                    let postsList = JSON.parse(req.body["postsList"]);
                    console.log("postsList"+postsList);
                    let keys = Object.keys(postsList);
                    if(!postId || !uploadCounts){
                        res.send({result:false,message:"uploading infos not found in cache"});
                    }
                    else{
                      let postIds = [];
                      let rootPostId = postId.split("===.")[0];
                      if (rootPostId) {
                        let accepteds = 0;
                        for(let postsItterator = 0 ; postsItterator < keys.length ; postsItterator++){
                            if(postsItterator < 20 && postsList[keys[postsItterator]]) {
                                let now = new Date();
                                let newPostDatas = postsList[keys[postsItterator]];
                                let allCategories = [];
                                let targetPostId = rootPostId+"-"+keys[postsItterator];
                                let categoriesList = newPostDatas.category || [];
                                
                                // create other things
                            
                                
                                let privacy = newPostDatas.privacy;
                                let caption = newPostDatas.caption;
                                let cost = newPostDatas.cost;
                                
                                let location = newPostDatas.location;
                                let tags = newPostDatas.tags;
                                

                                let albumId = newPostDatas.albumId || null;
                        
                                // update album If Have
                                
                                // Gathering Datas

                                let costx = 0;
                                if (!isNaN(parseInt(cost)) && cost > -1 && cost < 1000000) {
                                    costx = cost;
                                }
                                
                                let str = "";
                                if (typeof caption === "string" && (caption.length >= 0)) {
                                    str = caption;
                                }
                                let categoryx = [];
                                if (typeof categoriesList === "object") {
                                    categoryx = categoriesList;
                                }
                    

                                
                                let locationx = null;
                                if (typeof location === "object") {
                                    locationx = location;
                                }
                                let tagsList = [];
                                if ((typeof tags=== "object")) { // userIds
                                    tagsList = tags; // json list json["1"] === "list"
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
                                let albumIdx =  null;
                                if(typeof albumId === "string"){
                                    albumIdx = albumId;
                                }
                                postIds.push(targetPostId);
                                let postQuery = {
                                    postId: targetPostId,
                                    albumId: null,
                                    activated: false
                                };

                                console.log(postQuery);
                                postSchema.update(postQuery, { //// jeezzz
                                    $set: {
                                        album: albumIdx,
                                        activated: true,
                                        hashtags: hashtags,
                                        isPrivate: privacy,
                                        mentions: mentions,
                                        caption: str || "",
                                        categories: categoryx,
                                        location: locationx,
                                        updatedAt: now.getTime(),
                                        tags: tagsList,
                                        "originalImage.cost": costx// 0 if free // must complete tonight
                                    }
                                }, function (err, resultx) {
                                    if (err) throw err;
                                    if (resultx.n===1) {
                                        accepteds += 1;
                                        console.log(postQuery + "post activated"); // post activated successfully   
                                        for (let c = 0; c < categoryx.length; c++) { // create hourly category
                                            if (categoryx[c] && (categoryx[c] !== undefined)) {
                                                categories.addCategory(now, 0, categoryx[c],function (callback) {
                                                    if (callback === true) {
                                                        console.log("add hour category");
                                                        categories.addCategory(now, 1, categoryx[c],function (callback2) {
                                                            if (callback2 === true) {
                                                                console.log("add day category");
                                                                categories.addCategory(now, 2, categoryx[c],function (callback2) {
                                                                    if (callback2 === true) {
                                                                        console.log("add month category");
                                                                    }
                                                                });
                                                                // month and yearly objects creates schaduled // for month , yeach 1 week maybe 
                                                                // console.log("add day category");
                                                                // Category.Create(now, 2, categoryx[c],function (callback) { // month
                                                                //     if (callback === true) {
                                                                //         console.log("add month category");
                                                                //     }
                                                                //     else{
                    
                                                                //     }
                                                                // });
                                                                
                                                            }
                                                            else{
            
                                                            }
                                                        });
                                                    }
                                                    else{
    
                                                    }
                                                });
                                                
                                            }
                                        }

                                        // update album
                                        albumSchema.update({
                                            albumId: albumIdx,
                                            $or: [{ownerId: user.userId}, {collaborators:[user.userId]}],
                                            activated: true
                                        }, {
                                            $inc:{counts:1},
                                            $set:{
                                                updatedAt:now.getTime()
                                            }
                                        }, function (err, updates) {
                                            if (err) throw err;
                                            if (updates.n === 1) {
                                                console.log("album update successfull");
                                            }
                                            else {
                                                console.log("album update failed err : " + JSON.stringify(updates));
                                            }

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
                                            if (postsItterator === 19 || (postsItterator === keys.length -1)){

                                                userSchema.update({userId:user.userId,activated:true,deleted:false},{
                                                    $inc:{postsCount:accepteds}
                                                },function(err,resultx){
                                                    if(resultx.n>0){
                                                        users.updateSingleUserInfoInCache(user.userId,"postsCount",accepteds,"incr",function(result){
                                                            users.removeUploading(user);
                                                            console.log("activation complete");
                                                            res.send(result);
                                                        });
                                                    }
                                                });

                                                
                                            }
                                        });
                                    }
                                    else {
                                        console.log("post update failed"); // 
                                        if (postsItterator === 19 || (postsItterator === keys.length -1)){
                                            res.send({
                                                result:false,
                                                message:"Update failed"
                                            })
                                        }
                                    }
                                });
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
                        activated:true,
                    }, {
                        $set: {
                            activated:false,
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
    view:function(req,res,user) { // caching for later
        if(user) {
            if(req.body && req.body.postId && typeof req.body.postId === "string") {
                let postId = req.body.postId;
                viewSchema.findOne({viewer:user.userId,refrenceId:postId,referenceType:"post",deleted:false,activated:true},{viewer:1,deleted:1},function(err,viewx) {
                    if (err) throw err;
                    if (viewx) {
                        res.send({result:true,message:"already viewd"});
                    }
                    else{
                        var postOwnerId = posts.getPostOwnerIdByDecrypt(postId);

                        if(user.followings.indexOf(postOwnerId) > -1 || postOwnerId === user.userId){
                            posts.doView(user.userId,postId,true,"post",res); // post and account privacy bypass
                        }
                        else{
                            let blocked = (user.blockList.indexOf(postOwnerId) > -1);
                            if(blocked){
                                res.send({result:false,message:"you blocked the post owner"});
                            }
                            else{  
                                blocks.check(postOwnerId,user.userId,function(blocked){
                                    if(blocked){
                                        res.send({result:false,message:"youve been blocked by the post owner"});
                                    }
                                    else{
                                        users.getUserInfosFromCache(postOwnerId,function(hostUser){
                                            if (hostUser.message) {
                                                res.send(hostUser);
                                            }
                                            else{
                                                if(!hostUser.privacy){
                                                    posts.doView(user.userId,postId,true,"post",res); // post privacy bypass
                                                }
                                                else{ // certainly didnt view so 

                                                    posts.doView(user.userId,postId,false,"post",res); // post privacy bypass
                                                }
                                            }          
                                        });
                                    }
                                }); 
                            }
                        }
                    }
                });
            }
            else{
                res.send({result:true,message:"504 bad request"});
            }
        }
        else{
            res.send({result:true,message:"Not Authenticated - view"});
        }
    },
    doView:function(userId,referenceId,privacyStat,referenceType,res){
        let query = {
            referenceType:referenceId,
            referenceType : referenceType, // post , blog , new , message ... 
            rejected:null,
            activated:true,
            deleted:false,
            isPrivate:{"$exists":true}
        };
        if(!privacyStat){
            query.isPrivate = false;
        }
        // if type === post 
        postSchema.findOneAndUpdate(query,{"$inc":{views:1}},{
            "fields":{
                "album":1,
                "isPrivate":1,
            },
            "new":true
        },function(err,postx){
            if(err){
                res.send({result:false,message:"Oops Do view Went Wrong"});
            }
            if(postx){
                View.create({viewer:userId,referenceId:postId,referenceType:referenceType},function(resultv){
                    if(resultv===true){
                        users.increasePostOwnerViews(userId,function(resultc){
                            if(!resultc.message){
                                if(typeof postx.albumId==="string"){
                                    albums.increaseAlbumViews(postx.albumId,function(resulta){
                                        res.send(resulta);
                                    });
                                }
                                else{
                                    res.send(true);
                                }
                            }
                            else{
                                res.send(resultc);
                            }
                        });
                    }
                    else{
                        res.send({result:resultv,message:"Create View Record Failed"});
                    }
                });
            }
            else{
                res.send({
                    result:false,
                    message:"Access Denied"
                })
            }
        });
    },
    rate:function(req,res,user){ // caching for later
        if(user) {
            if(req.body && req.body.postId && typeof req.body.postId === "string" && req.body.value && parseInt(req.body.value) <= 7 && parseInt(req.body.value) >= 1) {
                let postId = req.body.postId;
                let rateValue = parseInt(req.body.value);
                rateSchema.findOne({rater:user.userId,referenceId:postId,referenceType:"post"},{rateId:1,changes:1,rater:1,postId:1,value:1},function(err,ratex) {
                    if (err) throw err;
                    let rateObject = ratex;
                    if(!ratex || ratex.changes < 3){
                        let postOwnerId = posts.getPostOwnerIdByDecrypt(postId);
                        if(user.blockList.indexOf(postOwnerId) > -1) {
                            res.send({result:false,message:"You Blocked the post owner"});
                        }
                        else{
                            let postOwnerId = posts.getPostOwnerIdByDecrypt(postId);
                            if(user.followings.indexOf(postOwnerId) > -1){
                                posts.doRate(user.userId,postId,"post",rateValue,rateObject,true,res); // post and account privacy bypass
                            }
                            else if(user.userId === postOwnerId){
                                res.send({result:true,message:"You cant rate your own post"});
                            }
                            else{
                                blocks.check(postOwnerId,user.userId,function(blocked){
                                    if(blocked){
                                        res.send({result:false,message:"youve been blocked by the post owner"});
                                    }
                                    else{
                                        users.getUserInfosFromCache(postOwnerId,function(hostUser){
                                            if (hostUser.message) {
                                                res.send(hostUser);
                                            }
                                            else{
                                                if(!hostUser.privacy){
                                                    posts.doRate(user.userId,postId,rateValue,rateObject,true,"post",res); // post privacy bypass
                                                }
                                                else{ 
                                                    posts.doRate(user.userId,postId,rateValue,rateObject,false,"post",res); // only publics
                                                }
                                            }          
                                        });
                                    }
                                }); 
                                
                            }
                        }    
                    }
                    else{
                        res.send({result:false,message:"Youve changed your rate 3times , no more allowed , sorry ;)"});
                    }
                });
            }
        }
    },
    doRate:function(userId,referenceId,rateNumber,rateObject,privacyStat,referenceType,res){
        posts.getPostInfoById(referenceId,privacyStat,function(post){
            if(post){
                if(rateObject){
                    let now = Date.now();
                    let newChanges = rateObject.changes + 1;
                    rateSchema.update({referenceId:rateObject.referenceId,rater:userId,referenceType:"post",value:{$ne:rateNumber}},{ // last rate value
                        $set:{
                            value:rateNumber,
                            changes : (newChanges),
                            updatedAt : now
                        },
                    },function(err,resultr){
                        if(err) 
                            res.send({result:false,message:"Update rate object failed + err"});
                        if(resultr.n > 0){
                            //let smallImageUrl = "../pictures/"+post.postId + "--Small===."+post.ext;
                            // users.pushNotification("environment","Changed rate post "+ rateNumber,hostUser.userId,user.userId,postId,"/post/"+postId,"",smallImageUrl,now);
                            let lastRate = rateObject.value;
                            let counts = parseInt(post.rate.counts);
                            let diff = parseFloat(rateNumber - lastRate); // + , - 0.change
                            let Numberchange = parseFloat(diff/(counts));
                            let valueChange =  (parseFloat (Numberchange / post.views))*100; // (changes+1)); // anytime changes drops + valuation effect 
                            posts.updatePostRates(res,{postId:post.postId},{
                                $inc:{
                                    "rate.number" : Numberchange,
                                    "rate.value" : valueChange,
                                    "rate.points" : diff,
                                    }
                            },{albumId:post.album,ownerId:post.ownerId,rateDiff:differance,postRateCounts:counts,postViews:post.views,response:parseFloat(rateObject.number+Numberchange).toString()+"/update"});
                        }
                        else{
                            res.send({result:false,message:"Update rate object failed"});
                        }
                    });
                        
                    }
                    else {
                        let rateObj = {};
                        rateObj.rater = userId;
                        rateObj.value = rateNumber;
                        rateObj.referenceId = referenceId;
                        Rate.create(rateObj,function(rateId){
                            if(rateId !== false){
                                // let smallImageUrl = "../pictures/"+postId + "-Small===.";
                                // users.pushNotification("environment"," Rated your post "+ rateNumber,hostUser.userId,user.userId,postId,"/post/"+postId,"",smallImageUrl,function(resultx){
                                //     console.log(" xxxxxxxxxx unread notifications after create " + resultx);
                                // });
                                let counts = parseInt(post.rate.counts) + 1;
                                let avg = parseFloat(post.rate.number);
                                let differance = parseFloat(rateNumber - avg); // + , - 0.change
                                let numberChange = parseFloat(differance/(counts));
                                let valueChange =  parseFloat (numberChange / post.views)*100; //
                                posts.updatePostRates(res,{postId:post.postId},{
                                    $inc:{
                                        "rate.value" : valueChange,
                                        "rate.number" : numberChange, // + 1 to 6
                                        "rate.points" : differance,
                                        "rate.counts": 1
                                    }
                                },{albumId:post.album,rateDiff:differance,ownerId:post.ownerId,postRateCounts:counts,postViews:post.views,response:parseFloat(avg+numberChange).toString()+"/new/"+rateId.toString()});
                            }
                            else{
                                res.send({result:false,message:"Rate Object Did not Created"});
                            }
                        });
                    }
                }
                else{
                    res.send({result:false,message:"Post Info Not Found"});
                }
        });
    },
    updatePostRates:function(res,query,updates,input){
        postSchema.update(query,updates,function(err,result){
            if(err) throw err;
            if(result.n > 0){
                if(input.ownerId){
                    users.updateUserRates(input,function(resultu){
                        if(!resultu.message){
                            if(input.albumId){
                                albums.updateAlbumRates(input,function(resulta){
                                    if(!resulta.message){
                                        console.log("post parent album rates updated");
                                    }
                                    else{
                                        res.send(resulta);
                                    }
                                });
                                res.send(object.response);
                            }
                            else{
                                res.send(input.response);
                            }
                        }
                    });
                }
                else{

                }
            }
            else{
                res.send({result:false,message:"post rate values failed to update"});
            }
        });
    },
    getPostOwnerIdByDecrypt:function(postId){

        let changedPostId = postId.split("|").join("/").slice(0,-2); // rooted
        let bytes = CryptoJS.AES.decrypt(changedPostId,secret.postIdKey);
        let decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted.split("|-p")[0].toString();
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
    }
};


module.exports = posts;
