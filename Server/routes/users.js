var userSchema = require('../models/user.model');
var User = new userSchema();
var jwt = require('jwt-simple');
var followSchema = require('../models/follow.model');
var Follow = new followSchema();
var follows = require('./follows');
var notificationSchema = require('../models/notification.model');
var Notification = new notificationSchema();
var flw = require("./follows");
var blockSchema = require("../models/block.model");
var Block = new blockSchema();
var redis = require('redis');
var random = require('randomstring');
var requestIp = require("request-ip");
var CryptoJS = require("crypto-js");
let validateUser = require('./auth').validateUser;
var redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});


/* GET home page. */
var users = {

    getMe: function (req, res, data) {
        res.send(data);
    },
    getUserByUsername: function (username,deleted,activated,callback) {
        userSchema.findOne({username:username,deleted:deleted,activated:activated},{userId:1},function(err,userx){
            if(err) throw err;
            return callback(userx);
        })
    },
    generateAccessKey(type,req,res){
        let clientIp = requestIp.getClientIp(req);
        let encryptionKey = CryptoJS.AES.encrypt(clientIp,"IP Key Encryption").toString();
        redisClient.set(type+"Key:"+ clientIp,encryptionKey);
        redisClient.expire(type+"Key:"+ clientIp,300000); //5 minutes
        res.send(encryptionKey);
    },
    checkIsTaken : function(req,res) {
        let type = req.body.type || "username";
        if ((req.body.text) && ((type === "username") || (type === "email") || (type === "phoneNumber")) && (typeof req.body.text === "string" && (req.body.text.length > 3))) {
            let query;
            if (type === "username") {
                query = {username: req.body.text};
            }
            else if (type === "email") {
                query = {email: req.body.text}
            }
            else {
                query = {phoneNumber: req.body.text}
            }

            userSchema.findOne(query,{username:1},function(err,userx){
                if(err) res.send({result:false,message:"Oops something went wrong"});
                console.log(userx);
                if(!userx){
                    res.send(true);
                }
                else{
                    res.send({result:false,message:type + " already taken"});
                }
            })

        }
        else{
            res.send({result:false,message:"504 Bad request"});
        }
    },
    register: function (req, res) {

        if(req.body["info"]) {
            let encryptedInfo = req.body["info"];
            let clientIp = requestIp.getClientIp(req);
            redisClient.get("registerKey:"+clientIp, function (err, regKey) {
                if (err) res.send({result: false, message: "key did not found in cache"});
                if (!regKey) {
                    res.send({result: false, message: "register key expired", status: 400});
                }
                else {
                    console.log(regKey);
                    let bytes = CryptoJS.AES.decrypt(encryptedInfo, regKey);
                    let decrypted = bytes.toString(CryptoJS.enc.Utf8);
                    console.log("encryptedInfo : " + encryptedInfo + "\n" + "decrypted " + decrypted);
                    let username = decrypted.split("/")[0].toLowerCase();
                    let email = decrypted.split("/")[1].toLowerCase();
                    let userId = random.generate(12);
                    let pst = decrypted.split("/")[2].toString();
                    let password = CryptoJS.HmacSHA512(userId,pst);
                    let emailVerificationKey = random.generate(6);
                    let smsVerificationKey = random.generate(6);


                    userSchema.findOne({$or: [{username: username}, {email: username}]}, function (err, user) {
     
                        if (err)
                            res.send({result: false, message: "Oops Something went wrong - please try again"});
                        if (user) {
                            res.send({
                                result: false,
                                message: "user with username -> " + username + " already exists"
                            });
                        }
                        else {

                            let roles = [];
                            if (username === "sabet") {
                                roles.push("admin");
                                roles.push("superuser");
                                roles.push("sabet");
                            }
                            else if (username === "alireza") {
                                roles.push("admin");
                            }
                            let now = Date.now();
                            let userObject = {
                                userId: userId,
                                username: username,
                                email: email,
                                fullName: "",
                                profilePictureSet: "male.png",
                                favouriteProfiles: [], // user ids  //  up to 6   // -->   get most popular profile
                                interestCategories: [], // categories  //  up to 6   // -->   field of theyr intrest for suggest and advertise
                                password: password, // hashed password
                                gender: "",
                                birthDate: null,
                                followingsCount: 0,
                                followersCount: 0,
                                blockList:[],
                                followings:[],
                                location: "",
                                city: "",
                                country: "",
                                phoneNumber: "",
                                rate: {
                                    value: 0.0,
                                    points: 0,
                                    counts: 0,
                                },
                                views: 0,
                                postsCount: 0,
                                reportsCount: 0,
                                verified: {
                                    emailVerified: false,
                                    phoneVerified: false,
                                    email: {
                                        key: emailVerificationKey,
                                        expire: (now + (10 * 24 * 3600000)), // 10d
                                    },
                                    sms: {
                                        key: smsVerificationKey,
                                        expire: (now + (10 * 24 * 3600000)), // 10d
                                    }
                                },
                                bio: String,
                                badges: [], // badgeIds -->
                                roles: [], // String - Sabet / Admin / Curator / Blogger / Premium / --> founder <-- under 1000 --> future advantages --> + premium ...
                                activated: true,
                                privacy: req.body.privacy || false,
                                viewedPosts: [], // last 100s
                                ban:null,
                                createdAt: now,
                            };
                            User.create(userObject, function (callback) {
                                if (!callback) {
                                    
                                    res.send({
                                        result: false,
                                        message: "Oops Something Went Wrong , please try again later"
                                    });
                                }
                                else {
                                    users.pushNotification("system", " Welcome to Hexaks network '" + userObject.username + "' we hope you enjoy our service <3 ", userObject.userId, "Hexaks");


                                    res.send(genToken(userObject.userId));
                                }
                            });
                            // users.sendVerificationEmail();
                        }
                    });
                }
            });
        }
        else{
            res.send({result:false,message:"504 bad request",status:504});
        }

    },

    initialUpload: function (req, res, user) {

        let cookiesList = parseCookies(req);
    
        let token = (req.body && req.body.storedPostDatas) || (req.query && req.query.storedPostDatas) || req.headers['storedPostDatas'] || cookiesList['storedPostDatas'];

        if(!token){
            users.removeUploading(user);
        }
        redisClient.get(user.userId + ":uploadingPost", function (err, postId) {
            if (err) throw err;
            if (postId) {
                redisClient.get(user.userId + ":uploadCounts", function (err, uploadCounts) {
                    if(err) throw err;
                    res.send({postId: postId, uploadCounts: uploadCounts});
                    redisClient.expire(user.userId + ":uploadingPost", 3600000); // 1h
                });
            }
            else {
                redisClient.set(user.userId + ":uploading", req.body.type, function (err, callback) {
                    if (err) throw err;
                    redisClient.expire(user.userId + ":uploading", 3600000); // 1h
                    res.send(true);
                });
            }
        });
        
    },

    removeUploading: function (user) {
        redisClient.del(user.userId + ":uploading");
        redisClient.del(user.userId + ":uploadingPost");
        redisClient.del(user.userId + ":uploadCounts");
    },

    extendExpiration: function (user) {
        redisClient.get("online:"+user.userId, function (err, value) {
            if (!value) {
                redisClient.set("online:"+user.userId, true);
            }
            redisClient.expire("online:"+user.userId, 10000);
        });

    },

    disconnect: function (req, res, user) {
        if(req.body && req.body.hostId) {
            let hostId = req.body.hostId;
            flw.unfollow(req, user,hostId);
            userSchema.findOne({userId:hostId},{username:1,privacy:1,followings:1,userId:1},function(err,host){
                if(err) throw err;
                if(host) {
                    flw.unfollow(req, host, user.userId);
                }
            });
        }
    },

    block: function (req, res, user) { // no cache for now
        
        blocks.block({blocker:user.userId,blocked:req.body.blockId},function(callback){
            if(callback===true){
                userSchema.update({userId: user.userId},{
                    $addToSet: {blockList : req.body.blockId}
                },function(err,resultx){
                    if(err) throw err;
                    if(result.n>0){
                        res.send(true);
                    }
                    else{
                        res.send(resultx);
                    }
                });
                users.disconnect(user.userId,req.body.blockId);
            }
            else{
                res.send(callback);
            }
        });
    },
    
    unblock: function (req, res, user) {
        blocks.unblock({blocker:user.userId,blocked:req.body.blockId},function(callback){
            if(callback===true){
                userSchema.update({userId: user.userId},{
                    $pull: {blockList : req.body.blockId}
                },function(err,resultz){
                    if(err) throw err;
                    if(result.n>0){
                        res.send(true);
                    }
                    else{
                        res.send(resultz);
                    }
                });
            }
            else{
                res.send(callback);
            }
        });
    },

    getHostProfile: function (req, res, user) { // no privacy considered !.
        let hostUsername = req.body.host;
        if((typeof hostUsername === "string") && (hostUsername.length>3)){
            users.getUserIdFromCache(hostUsername,function(userId) {
                if(user){
                    
                }
                else{

                }
                users.getUserInfosFromCache(userId,function(hostUser){
                    if(!hostUser.message){
                        let response = {user: hostUser, following: false, followed: false};
                        if (user === null) {
                            response.following=null;
                            response.followed = null;
                            res.send(response);
                        }
                        else {
                            if (user.userId === userId) {
                                response.following=null;
                                response.followed = null;
                                res.send(response);
                            }
                            else {
                                
                                if(userx.blockList.indexOf(user.userId) > -1){
                                    res.send({result:false,message:"not found"});
                                }
                                else {
                                    if (userx.privacy) {
                                        if (user.followings.indexOf(userId) === -1) {
                                            delete userx.phoneNumber;
                                            delete userx.birthDate;
                                            delete userx.interestCategories;
                                            delete userx.favouriteProfiles;
                                            delete userx.fullName;
                                            delete userx.email;
                                            delete userx.location;
                                        }
                                    }
                                    if (userx.followings.indexOf(user.userId) > -1) {
                                        response.followed = true;
                                    }
                                    if (user.followings.indexOf(userId) > -1) {
                                        response.following = true;
                                    }
                                    if(user.blockList.indexOf(userx.userId) > -1){
                                        response.blocked = true; // you blocked him
                                    }
                                    res.send(response);
                                }
                            }
                        }
                    }   
                    else{
                        res.send({result: false, message: "User with username " + hostUsername + " Not Found"});
                    }
                });
            });
        }
        else{
            res.send({result:false,message:"not found"});
        }
    },

   
    updateProfileInfo:function(req,res,user){
        if(!user.ban.is){
            if(user.username === req.body["username"].toLowerCase()){

            }
            else{
                userSchema.findOne({username:req.body["username"].toLowerCase()},function(err,user) {
                    if (err) res.send(err);
                    if (user) {
                        res.send({result:false,message:"username already token"});
                    }
                    else{
                        user.fullName = req.body["fullName"];
                        user.email = req.body["email"];
                        user.city = req.body["city"];
                        user.bio = req.body["bio"];
                        user.username = req.body["username"].toLowerCase();
                        user.save();
                        res.send(true);
                    }
                });
            }

        }
        else{
            res.send({result:false,false:"sorry you cant change your info till your ban expires : "+(user.ban.expire - Date.now()) });
        }
    },
    changePassword:function(req,res,user){
        let password = req.body.password;
        let newPassword = req.body.password;
        if(password && typeof password === "string" && newPassword && typeof newPassword === "string" && password.length > 5 && newPassword.length > 5){
            let hashPassword = CryptoJS.HmacSHA512(password, user.userId);
            let newHashPassword = CryptoJS.HmacSHA512(password, user.userId);
            userSchema.update({userId:user.userId , password:hashPassword},{$set:{
                    password : newHashPassword
                }},function(err,result){
                    if(err) throw err;
                    if(result.n > 0){
                        res.send(true);
                    }
                    else{
                        res.send({result:false,message:"Password change failed"});
                    }
                });
        }
        else{
            res.send({result:false,message:"504 Bad Request"});
        }

    },
    resetPassword:function(type,identification){ // email or phone number , username or email

    },
    updatePrivacy:function(userId,situation,callback){
        userSchema.update({userId: userId,privacy:!situation}, {
            $set: {privacy:situation}
        },function(err,result){
            if(err) throw err;
            if(result.n > 0) {
                users.updateSingleUserInfoInCache(userId, "privacy", true, function (callback2) {
                    callback(callback2);
                });
            }
            else{
                callback({result:false,message:"504 Bad Request"});
            }
        });
    },
    getUserInfosFromCache:function(userId,callback){

        redisClient.hgetall( "info:"+userId, function (err, info) {
            if (err) callback(err);
            if (info) {
                return callback(info);
            }
            else {
                users.updateAllUserInfosInCache(userId,function(resulx){
                    return callback(resulx);
                });
            }
        });
    },
    getUserIdFromCache:function(username,callback){
        redisClient.get("userId:"+username,function(err,userId) {
            if(err) 
                return callback({result:false,message:" user name not found"});
            else{
                if(userId){
                    return callback(userId);
                }
                else{
                    users.getUserByUsername(username,false,true,function(hostUser){
                        if(hostUser){
                            redisClient.set("userId:"+username,hostUser.userId,function(err,resx) {
                                if(err) throw err;
                                return callback(hostUser.userId);
                            });
                        }
                        else{
                            return callback({result:false,message:"404 Not Found"});
                        }
                    });
                }
            }
        });
    },
    updateAllUserInfosInCache:function(userId,callback){
        userSchema.findOne({userId: userId}, {
            _id: 0,
            userId: 1,
            username: 1,
            fullName:1,
            country:1,
            location:1,
            city:1,
            profilePictureSet: 1,
            followersCount:1,
            followingsCount:1,
            gender: 1,
            views:1,
            postsCount:1,
            reportsCount:1,
            roles:1,
            privacy: 1,
            rate: 1,
        }, function (err, user) {
            if (err) throw err;
            if (user) {
                redisClient.hmset(["info:"+user.userId,"userId",user.userId, "username", user.username,"fullName",user.fullName,"flwers",user.followersCount,"flwings" ,user.followingsCount,"location",user.city+":"+user.country+"/"+user.location,
                "postsCount",user.postsCount,"reportsCount",user.reportsCount,"roles",JSON.stringify(user.roles),"privacy", user.privacy, "gender", user.gender,
                    "profilePictureSet", user.profilePictureSet, "rate",JSON.stringify(user.rate.value) ,"views", user.views ]); // must add to a zset --> points
                redisClient.expire("info:"+user.userId, 300000);
                console.log("user infos updated in cache ,expire : 5minutes ");
                return callback({"userId":user.userId,"username": user.username,"fullName":user.fullName,"flwers" : user.followersCount,"flwings" : user.followingsCount,"location":user.city+":"+user.country+"/"+user.location,
                                "postsCount":user.postsCount,"reportsCount":user.reportsCount,"roles":user.roles,"privacy": user.privacy,"gender": user.gender,
                                "profilePictureSet": user.profilePictureSet, "rate": user.rate.value,"views": user.views});
            }
            else {
                return callback({result:false,message:"User information not found"});
            }
        });
    },
    increasePostOwnerViews:function(postOwnerId,callback){
        userSchema.update({userId:postOwnerId,activated:true},{
            $inc: {
                views: 1
            }
        },function(err,result){
            if(err) throw err;
            console.log(result);
            if(result.n > 0){
                return callback(true);
            }
            else{
                return callback({result:false,message:"post owner views didnt increase"});
            }
        });
    },
    updateSingleUserInfoInCache:function(userId,attr,value,callback){ // mongodb must change before or after this function updates cache without considering master db
        redisClient.hset("info:"+userId,attr,value); // must add to a zset --> points
        redisClient.expire("info:"+userId, 300000);
        console.log("user single info -" + value + "- updated in cache expire 5minutes:");
        return callback(true);
    },
    pushNotification:function(type,text,ownerId,creatorId,referenceId,link,icon,imageUrl,now,fn){
        
    },
    update: function(req, res,next,data) {

    },

    delete: function(req, res,next) {

        res.send(false);
    }

};






let secret = require('../config/secret');
module.exports = users;
function genToken(userId) {
    let expires = expiresIn(1); // 1 day
    let token = jwt.encode({
        exp: expires,
        key: userId
    },secret.userIdKey);
    
    return {
        token: token,
    };
}
function parseCookies (request) {
    let list = {},
        rc = request.headers.cookie;
    rc && rc.split(';').forEach(function( cookie ) {
        let parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });

    return list;
}
function expiresIn(numDays) {
    let dateObj = new Date();
    return dateObj.setDate(dateObj.getDate() + numDays);
}


