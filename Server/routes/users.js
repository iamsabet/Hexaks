var userSchema = require('../models/user.model');
var User = new userSchema();
var jwt = require('jwt-simple');
var followSchema = require('../models/follow.model');
var Follow = new followSchema();
var notificationSchema = require('../models/notification.model');
var Notification = new notificationSchema();
var flw = require("./follows");
var blocks = require("./blocks");
var blockSchema = require("../models/block.model");
var Block = new blockSchema();
var redis = require('redis');
var validator = require('validator');
var phoneValidator = require( 'awesome-phonenumber' );
var random = require('randomstring');
var rn = require('random-number');
const ipCountry = require('ip-country');
const variables = require("../variables");
var requestIp = require("request-ip");
var mails =  require("./mails");
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
    getUserIdByUsername: function (username,deleted,activated,callback) {
        userSchema.findOne({username:username,deleted:deleted,activated:activated},{userId:1},function(err,userx){
            if(err) throw err;
            return callback(userx);
        })
    },
    generateAccessKey(type,req,res,user){
        let clientIp = requestIp.getClientIp(req);
        let encryptionKey ="";
        if(user){
            encryptionKey = CryptoJS.AES.encrypt(clientIp,secret.ipKey+secret.adminKey).toString();
            redisClient.set(type+"Key:"+ user.userId,encryptionKey);
            redisClient.expire(type+"Key:"+ user.userId,300); //5 minutes
        }
        else{
            encryptionKey = CryptoJS.AES.encrypt(clientIp,secret.ipKey).toString();
            redisClient.set(type+"Key:"+ clientIp,encryptionKey);
            redisClient.expire(type+"Key:"+ clientIp,3000); //50 minutes
        }
        res.send(encryptionKey);
    },
    checkValidationAndTaken : function(text,type,user,callback) {
        let canQuery = true;
        let TempText = text;
        if(text===null){
            return callback(true); 
        }
        if ((text) && ((type === "username") || (type === "email") || (type === "phoneNumber")) && (typeof text === "string" && (text.length > 3))) {
            if(type === "email"){
                if(!validator.isEmail(text)){

                    return callback({result:true,message:"Invalid email"});
                }
            }
            else if(type==="phoneNumber"){
                text = text.split("/").join("");
                if(text.length < 8 || !validator.isMobilePhone(text)){
                    return callback({result:true,message:"Invalid mobile phone number"});
                }
            }
            if(type==="username"){
                text = text.slice(0,23).toLowerCase();
            }
            let query={};

            if(!user.message){
                if(type==="phoneNumber"){
                    let countryObj = variables.phoneCodes[TempText.split("/")[0]];
                    if(countryObj){
                        query["phone.code"] = parseInt(TempText.split("/")[0]);
                        query["phone.number"] = parseInt(TempText.split("/")[1]);
                        
                    }
                    else{
                        canQuery = false;
                    }
                }
                else{
                    query[type] = text;
                }
                if(canQuery){
                    
                    userSchema.findOne(query,{username:1},function(err,userx){
                        if(err) return callback({result:true,message:"Oops something went wrong"});
                        if(!userx){
                            return callback(true);
                        }
                        else{
                            return callback({result:true,message:" already taken"});
                        }
                    });
                }
                else{
                    return callback({result:true,message:"Country code does not found / invalid phone number"});
                }
            }
            else{
                
                canQuery = (user[type] !== text) || false; // not the same condition
                query[type] = text;
                userSchema.findOne(query,{username:1},function(err,userx){
                    if(err) return callback({result:true,message:"Oops something went wrong"});
                    if(!userx){
                        return callback(true);
                    }
                    else{
                        return callback({result:true,message:" already taken"});
                    }
                });
            }
        }
        else{
            return callback({result:false,message:"504 Bad request"});
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
                    // send email verifications 1day
                    let emailVerificationKey = random.generate(16);
                    

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
                                user_id: 0,
                                userId: userId,
                                username: username,
                                email: email,
                                fullName: "",
                                url : "",
                                profilePictureSet: "male.png",
                                favouriteProfiles: [], // user ids  //  up to 6   // -->   get most popular profile
                                interestCategories: [], // categories  //  up to 6   // -->   field of theyr intrest for suggest and advertise
                                password: password, // hashed password
                                gender: -1 , // 0 female 1male 2 others
                                birthDate: -1,
                                birth:{
                                    day:-1,
                                    month:-1,
                                    year:-1,
                                },
                                followingsCount: 0,
                                followersCount: 0,
                                blockList:[],
                                followings:[], //
                                followingCategories : [], //
                                followingHashtags : [], //
                                followingLocations : [], //
                                followingDevices : [], //
                                location: "",
                                city: "",
                                country: "",
                                phone:null,
                                rate: {
                                    value: 0.0,
                                    points:0,
                                    number: 0.0,
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
                                        expire:0, // 1 day
                                    },
                                    sms: {
                                        key: null,
                                        createdAt:0, // verified time
                                    }
                                },
                                bio: "",
                                badges: [], // badgeIds --> // selecteds only 
                                roles: roles, // String - Sabet / Admin / Curator / Blogger / Premium / --> founder <-- under 1000 --> future advantages --> + premium ...
                                activated: true,
                                privacy: req.body.privacy || false,
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
                                else { // create user successfull 
                                    users.sendEmailVerification(userObject.userId,userObject.email,emailVerificationKey,function(resultV){
                                        if(!resultV.message){

                                            users.updateAllUserInfosInCache(userObject.userId,function(callback){

                                                if(callback && !callback.message){

                                                    res.send(genToken(userObject.userId));
                                                }
                                                else{
                                                    res.send(callback);
                                                }
                                            });
                                        }
                                        else{
                                            res.send(resultV);
                                        }
                                    });
                                    // users.pushNotification("system", " Welcome to Hexaks network '" + userObject.username + "' we hope you enjoy our service <3 ", userObject.userId, "Hexaks");  
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
        redisClient.get("uploadingPost:"+user.userId,function (err, postId) {
            if (err) throw err;
            if (postId) {
                redisClient.get("uploadCounts:"+user.userId, function (err, uploadCounts) {
                    if(err) throw err;
                    
                    res.send({postId: postId, uploadCounts: uploadCounts});
                });
            }
            else {
                redisClient.set("uploading:"+user.userId, req.body.type, function (err, callback) {
                    if (err) throw err;
                    redisClient.expire("uploading:"+user.userId, 3600000); // 1h
                    res.send(true);
                });
            }
        });
    },

    removeUploading: function (user) {
        redisClient.del("uploading:"+user.userId);
        redisClient.del("uploadingPost:"+user.userId);
        redisClient.del("uploadCounts:"+user.userId);
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
            users.getUserIdFromCache(hostUsername,function(hostUserId) {
                if(!hostUserId.message){
                    if(user){
                        if(user.userId === hostUserId){
                            users.accessUserDatas(res,user,hostUserId);
                        }
                        else{
                            if(user.followings.indexOf(hostUserId) > -1){
                                users.accessUserDatas(res,user,hostUserId);
                            }
                            else{
                                blocks.check(hostUserId,user.userId,function(resultb){
                                    if(resultb){
                                        res.send({result:false,message:"404 Not Found"}); // youve been blocked by the user 
                                    }
                                    else{
                                        users.accessUserDatas(res,user,hostUserId);
                                    }
                                });
                            }
                        }
                    }
                    else{
                        
                    }
                }
                else{
                    res.send(hostUserId); // err message
                }
            });
        }
        else{
            res.send({result:false,message:"not found"});
        }
    },

   accessUserDatas:function(res,user,hostUserId){
    users.getUserInfosFromCache(hostUserId,function(hostUser){
        if(!hostUser.message){
            let response = {user: hostUser, following: false, followed: false};
            if (user === null) {
                response.following=null;
                response.followed = null;
                res.send(response);
            }
            else {
                if (user.userId === hostUserId) {
                    response.following=null;
                    response.followed = null;
                    res.send(response);
                }
                else {
                    if (user.followings.indexOf(hostUser.userId) > -1) {
                        response.following = true;
                        res.send(response);
                    }
                    else{
                        flw.check(hostUser.userId,user.userId,function(resultf){
                            if(!resultf){
                                response.followed = false; // you blocked him
                            }
                            else{
                                response.followed = true;
                                if(resultf.accepted && (typeof resultf.accepted === "boolean")){
                                    response.followedAccept = result.accepted;
                                }
                            }
                            if(JSON.parse(hostUser.privacy) || (user.followings.indexOf(hostUserId) === -1)){
                                flw.check(user.userId,hostUserId,function(resultf){
                                    if(resultf){
                                        if(resultf.accepted && (resultf.accepted===false)){
                                            response.following = true;
                                            response.followingAccept = false;
                                        }
                                        else{
                                            res.send({result:false,message:"inja nabayad miumad ghaedatan :/ flw shit :/"});
                                        }
                                    }
                                    res.send(response);
                                });
                            
                            }
                            else{
                                res.send(response);
                            }
                        });
                        
                    }
                }
            }
        }   
        else{
            res.send({result: false, message: "User with username " + hostUsername + " Not Found"});
        }
    });
   },
    updateProfileInfo:function(req,res,user){
        let fullName = req.body["fullName"];
        let city = req.body["city"];
        let bio = req.body["bio"];
        let errorMessages = {};
        let birthDay = req.body["birthDate"];
        let username = req.body["username"];
        let email = req.body["email"];
        let phoneNumber = req.body["phoneNumber"];
        if(!user.ban.is){      
            let updates = {};
            let canQuery = true;
            let query = {userId:user.userId}; 
            // 
            if(fullName && typeof fullName ==="string" && fullName !== ""){
                updates["fullName"] = fullName.slice(0,30);
            }

            if(city && (typeof city ==="string") && city !== ""){
                updates["city"] = city.slice(0,30);
            }
            if(bio && typeof bio ==="string" && bio !== ""){
                updates["bio"] = bio.slice(0,256);
            }
            // check is taken ,, all validations check then update and reload in client

            let birth = null;
            if(birthDay){
            birth = birthDay.split("/");
            }
            // bithdate
            if(birth !== null && birth.length===3){
                let month = parseInt(birth[0]);
                let day = parseInt(birth[1]);
                let year = parseInt(birth[2]);
                let thisYear = new Date().getFullYear();
                if((!isNaN(month) && (month < 13) && (month > 0)) && (!isNaN(day) && (day < 32) && (day > 0)) && (!isNaN(year) && (year <= thisYear) && (year > 0))){
                    updates["birth"] = {
                        day : day,
                        month : month,
                        year : year,
                    }
                    let birthDate = new Date(year, day, month).getTime();
                    updates["birthDate"] = birthDate;
                }
                else{
                    // add error date message
                }
            }
            let password = req.body["password"];
            if(username){
                updates["username"] = username;
            }
            else{
                updates["username"] = null;
            }
            if(email){
                updates["email"] = email ;
            }
            else{
                updates["email"] = null;
            }
            if(phoneNumber && (typeof phoneNumber==="string") && (phoneNumber.split("/").length===2)){
                updates["phoneNumber"] = phoneNumber.slice(0,23);
            }
            else{
                updates["phoneNumber"] = null;
            }
            // username
            if(updates["username"] || updates["email"] || updates["phoneNumber"]){
                if(!password || (typeof password !== "string") || password.length < 5){
                    canQuery = false;
                }
                else{
                    query["password"] = password;
                }
            }
            if(canQuery){
                users.checkValidationAndTaken(updates["username"],"username",user,function(resultu){
                    users.checkValidationAndTaken(updates["email"],"email",user,function(resulte){
                        users.checkValidationAndTaken(updates["phoneNumber"],"phoneNumber",user,function(resultp){

                            if(resultu.message){    
                                errorMessages["username"] = resultu.message;
                                delete updates["username"];
                            }
                            if(resulte.message){    
                                errorMessages["email"] = resulte.message;
                                delete updates["email"];
                            }
                            if(resultp.message){    
                                errorMessages["phoneNumber"] = resultp.message;
                                delete updates["phoneNumber"];
                            }
  
                            users.doUpdateInfo(query,updates,res,errorMessages);
                        });
                    });
                });
            }
            else{
                res.send({result:false,message:"incorrect password"});
            }
        }
        else{
            res.send({result:false,message:"sorry you cant change your info till your ban expires : "+(user.ban.expire - Date.now()) });
        }
    },
    doUpdateInfo:function(query,updates,res,errorMessages){
        
        console.log(query["password"]);
        if(query["password"]){
            query["password"] = CryptoJS.HmacSHA512(query["userId"],query["password"]).toString();
        }
        if(updates["phoneNumber"]){
            let tempPhone = updates["phoneNumber"];
            updates["phone"] = {
                "code" : parseInt(tempPhone.split("/")[0]),
                "number" : parseInt(tempPhone.split("/")[1])
            };
            let countryObj = variables.phoneCodes[updates["phone"].code];
            if(countryObj){
                updates["phone"].countryCode = countryObj.code;
            }
            else{

            }
        }
        let emailVerificationKey = null;
        let phoneVerificationKey = null;
        delete updates["phoneNumber"];
        
        if(!updates["username"] || updates["username"]=== null){
            delete updates["username"];
        }
        else{

        }
        if(!updates["email"] || updates["email"]=== null){
            delete updates["email"];
        }
        else{
            updates["verified.emailVerified"] = false;
            emailVerificationKey = random.generate(16);
        }
        if(!updates["phone"] || updates["phone"]=== null){
            delete updates["phone"];

        }
        else{
            updates["verified.phoneVerified"] = false;
            phoneVerificationKey = rn.generator({
                min:  100000
              , max:  999999
              , integer: true
              })();
        }

        userSchema.updateOne(query,{$set:updates},function(err,resultu) {
            if (err) res.send(err);
            if (resultu.n > 0) {
                if(updates["username"]){
                    
                }
                if(updates["email"]){
                    users.sendEmailVerification(query.userId,updates["email"],emailVerificationKey,function(resulte){

                    });
                }
                if(updates["phone"]){
                    users.sendPhoneVerification(query.userId,updates["phone"].code+"/"+updates["phone"].number,phoneVerificationKey,function(resultp){

                    });
                }
                // update cache 
                users.updateAllUserInfosInCache(query.userId,function(resultuf){
                    if(!resultuf.message){
                        if(Object.keys(errorMessages).length ===0){
                            res.send({result:true,message:false});
                        }
                        else{
                            res.send({result:true,message:errorMessages});
                        }
                    }
                });
            }
            else{
                errorMessages["result"] = "Wrong Password";
                res.send({result:false,message:errorMessages});
            }
        });
    },
    changePassword:function(req,res,user){
        let password = req.body.password;
        let newPassword = req.body.newPassword;
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
    sendPhoneVerification:function(userId,phoneNumber,key,callback){ // set in redis for verification code create expire in 
        let now = Date.now();
        now = now + 125000;
        users.sendSms(phoneNumber,key,"Phone Verification Key",function(resultSms){
            if(!resultSms.message){ // sms successfully sent    
                redisClient.set(userId+":phoneKey:"+phoneNumber,key,function(err,result){
                    if(err) throw err;
                    if(result){
                        redisClient.del(userId+":phoneKeyTimes:"+phoneNumber);
                        redisClient.set(userId+":phoneExpire:"+phoneNumber,now,function(err,resx){
                            if(err) throw err;
                            if(resx){
                                redisClient.expire(userId+":phoneExpire"+phoneNumber,120000);
                                redisClient.expire(userId+":phoneKey"+phoneNumber,120000); // 2mins
                                return callback(true);
                            }
                            else{
                                return callback({result:false,message:"phone expire set failed"});
                            }
                        });
                    }
                    else{
                        return callback({result:false,message:"phone key set failed"});
                    }
                });
            }
            else{
                return callback({result:false,message:"Send Message to number " + phoneNumber + " Failed"});
            }
        });
    },
    sendEmailVerification:function(userId,email,key,callback){
        let now = Date.now();
        let expire = now + (1 * 24 * 3600000); // 1 day expiration
        mails.sendEmail({email:email,key:key},"Email Verification Key",function(resultEmail){
            if(!resultEmail.message){ // email successfully sent    
                userSchema.updateOne({userId:userId},{$set:{"verified.emailVerified":false,"verified.email.key":key,"verified.email.expire":expire}},function(err,resultu){
                    if(err) throw err;
                    if(resultu.n > 0){
                        return callback(true);
                    }
                    else{
                        return callback({result:false,message:"update email veirfication key failed"});
                    }
                });
            }
            else{
                return callback({result:false,message:"Send Email to " + email + " Failed"});
            }
        });
    },
    getPhoneVerificationTimeLeft:function(userId,callback){
        redisClient.get(userId+":phoneExpire",function(err,targetKey){
            if(err) throw err;
            if(targetKey && (parseInt(targetKey) > 1000 )){
                return callback(parseInt(targetKey));
            }
        });
    },
    checkPhoneVerification:function(userId,phoneNumber,key,callback){ // set in redis for verification code create expire in 
        redisClient.get(userId+":phoneKey:"+phoneNumber,function(err,targetKey){
            if(err) throw err;
            if(targetKey && typeof targetKey === "string"){
                if(targetKey === key){
                    users.doVerifyPhone(userId,key,function(resultd){
                        return callback(resultd);
                    });
                }
                else{ // wrong key entered // 5times allowed 
                    redisClient.incr(userId+":phoneKeyTimes:"+phoneNumber,function(err,targetKey){
                        if(err) throw err;
                        if(!targetKey || ((parseInt(targetKey) > 0) && (parseInt(targetKey) < 5))){
                            return callback({result:false,message:"Invalid Phone Verification Key"});
                        }
                        else if(tagetKey && parseInt(targetKey >= 5)){
                            redisClient.del(userId+":phoneKey:"+phoneNumber);
                            redisClient.del(userId+":phoneKeyTimes:"+phoneNumber);
                            redisClient.del(userId+":phoneExpire:"+phoneNumber);
                            return callback({result:false,message:"phone key expired because of 5 times invalid attempt , request resend"});
                        }
                    });
                }
            }
            else{
                return callback({result:false,message:"verification key expired , request resend"});
            }
        });
    },
    doVerifyPhone:function(userId,key,callback){
        userSchema.updateOne({userId: userId,activated:true,deleted:false},{$set:{"verified.phoneVerified":true,"verified.sms.key":key,"verified.sms.createdAt":Date.now()}},function(err,result){
            if(err) throw err;
            if(result.n > 0){
                users.updateAllUserInfosInCache(userId,function(resultu){
                    if(resultu){
                        console.log("updated user cache done.");
                    }
                    else{
                        console.log("updated user cache failed!");
                    }
                });
                return callback(true);
            }
            else{
                return callback(result);
            }
        });
    },
    checkEmailVerification:function(userId,key,callback){
        
        if(userId){
            users.doVerifyEmail(userId,key,function(resultv){
                return callback(resultv);
            });
        }
        else if((userId === null) && key){
            userSchema.findOne({"verified.email.key":key,activated:true,deleted:false},{userId:1,username:1,fullName:1,verified:1},function(err,targetUser){
                if(err) throw err;
                if(targetUser){
                    let now = Date.now();
                    if(targetUser.verified.email.expire > now){
                        users.setEmailKeyInCache(targetUser.userId,key,function(resultg){
                            return callback(resultg);
                        });
                    }
                    else{
                        return callback({result:false,message:"Link has expired , request resend"});
                    }
                }
                else{
                    return callback({result:false,message:"No verified email"})
                }
            });
        }
        else{
            return callback({result:false,message:"bad input for now"});
        }
    },
    doVerifyEmail:function(userId,key,callback){
        
        userSchema.updateOne({userId:userId,"verified.email.key":key},{$set:{"verified.emailVerified":true}},function(err,resultu){
            if(err) throw err;
            if(resultu.n > 0){
                users.updateAllUserInfosInCache(userId,function(resultu){
                    if(!resultu.message){
                        redisClient.del(userId+":emailKey");
                        return callback(true);
                    }
                    else{
                        return callback({result:false,message:"update user infos in cache failed"});
                    }
                });
                
            }
            else{
                return callback({result:false,message:"update email veirfication key failed"});
            }
        });
    },
    setEmailKeyInCache:function(userId,key,callback){
        redisClient.set(userId+":emailKey",key,function(err,resultt){
            if(err) throw err;
            if(resultt){
                redisClient.expire(userId+":emailKey",5*60000); // 5mins
                return callback({result:true,message:""});
            }
            else{
                return callback({result:false,message:"email key in cache set failed!"});
            }
        });
    },
    getEmailKeyFromCache:function(userId,callback){
        redisClient.get(userId+":emailKey",function(err,key){
            if(err) throw err;
            if(key){
                return callback(key);
            }
            else{
                return callback({result:false,message:"email key not found in cache"});
            }
        });
    },
   
    sendSms:function(phoneNumber,key,title,callback){
        console.log(title + " / sms key : " + key + " / number : " + phoneNumber.split("/").join(""));
        return callback(true);
    },
    resetPassword:function(userId,type,identification,callback){ // email or phone number

        if(userId){
            if(type==="change"){
                let oldPass = identification["old"];
                let newPass = identification["new"];
                let confirmNewPass = identification["confirmNew"];
                if(newPass && confirmNewPass && oldPass && (newPass.length > 5) && (confirmNewPass.length > 5) && (oldPass.length > 5)){
                    if(newPass === confirmNewPass){
                        let hashPassword = CryptoJS.HmacSHA512(userId,oldPass).toString();
                        let newHashPassword = CryptoJS.HmacSHA512(userId,newPass).toString();
                        userSchema.updateOne({userId:userId,password:hashPassword},{$set:{password:newHashPassword}},function(err,resultu){
                            if(err) throw err;
                            if(resultu.n > 0){
                                return callback(true); // password reset successfully done
                            }
                            else{
                                return callback({result:false,message:"Wrong password"});
                            }
                        });
                    }
                    else{
                        return callback({result:false,message:"Password and confirm password does not match"});
                    }
                }
                else{
                    return callback({result:false,message:"504 bad input - minimum length = 6"});
                }
            }
        }
        else if((userId === null) && (typeof identification === "string")){
            if(type==="email"){
                if(validator.isEmail(identification.toLowerCase())){
                    userSchema.findOne({email:identification.toLowerCase()},{userId:1},function(err,targetUser){ // no verified at first 
                        if(err) throw err;
                        if(targetUser){
                            let emailVerificationKey = random.generate(16);
                            users.sendEmailVerification(targetUser.userId,identification.toLowerCase(),emailVerificationKey,function(results){
                                if(!results.message){
                                    let xxx = "Verification link sent to your Email : " + identification.toLowerCase();
                                    return callback({result:true,message:xxx});
                                }   
                                else{ // 
                                    return callback(results);
                                }
                            });
                        }
                        else{
                            return callback({result:true,message:"No verified email found "});
                        }
                    });
                }
                else{
                    return callback({result:true,message:"Invalid email"});
                }
            }
            else if(type="phone"){
                if(identification.split("/")[0] && (identification.split("/")[1]) && (!isNaN(parseInt(identification.split("/")[1]))) && (!isNaN(parseInt(identification.split("/")[0])))){
                    userSchema.findOne(
                        {
                            "phone.number":parseInt(identification.split("/")[1]),
                            "phone.code":parseInt(identification.split("/")[0]),
                            "verified.phoneVerified":true
                        },{userId:1},
                    function(err,targetUser){ // no verified at first 
                        if(err) throw err;
                        if(targetUser){
                            let smsVerificationKey = rn.generator({
                                min:  100000
                              , max:  999999
                              , integer: true
                              })();
                            users.sendPhoneVerification(targetUser.userId,identification,smsVerificationKey,function(results){

                                if(!results.message){
                                    return callback({result:true,message:"Verification code sent to phone number : +" + identification.split("/").join("")});
                                }   
                                else{ 
                                    return callback(results);
                                }
                            });
                        }
                        else{
                            return callback({result:true,message:"No verified phone number found "});
                        }
                    });   
                }  
                else{
                    return callback({result:false,message:"504 Bad request"});
                } 
            }
            else{
                return callback({result:false,message:"no more types for now"});
            }
        }
        else{
            return callback({result:false,message:"504 Bad request"});
        }
    },
    resetPasswordWithKey:function(userId,type,newPass,newConfirm){
        
        let newHashPassword = CryptoJS.HmacSHA512(userId,newPass).toString();
        userSchema.updateOne({userId:userId},{$set:{password:newHashPassword}},function(err,resultu){
            if(err) throw err;
            if(resultu.n > 0){
                return callback(true); // password reset successfully done
            }
            else{
                return callback({result:false,message:"Wrong password"});
            }
        });
    },
    updatePrivacy:function(userId,situation,callback){
        userSchema.update({userId: userId,privacy:!situation}, {
            $set: {privacy:situation}
        },function(err,result){
            if(err) throw err;
            if(result.n > 0) {
                users.updateSingleUserInfoInCache(userId, "privacy", true,"set",function (callback2) {
                    callback(callback2);
                });
            }
            else{
                callback({result:false,message:"504 Bad Request"});
            }
        });
    },
    getUserInfosFromCache:function(userId,callback){
        redisClient.hgetall("info:"+userId, function (err, info) {
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
                    users.getUserIdByUsername(username,false,true,function(hostUser){
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
            user_id:1,
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
                redisClient.hmset(["info:"+user.userId,"userId",user.userId, "username", user.username,"fullName",user.fullName,"followersCount",user.followersCount,"followingsCount" ,user.followingsCount,"location",user.city+":"+user.country+"/"+user.location,
                "postsCount",user.postsCount,"reportsCount",user.reportsCount,"roles",JSON.stringify(user.roles),"privacy", user.privacy, "gender", user.gender,"views",parseInt(user.views) ,
                    "profilePictureSet", user.profilePictureSet, "rate",JSON.stringify(user.rate)]); // must add to a zset --> points
                redisClient.expire("info:"+user.userId, 300000);
                console.log("user infos updated in cache ,expire : 5minutes ");
                return callback({"userId":user.userId,"username": user.username,"fullName":user.fullName,"followersCount" : user.followersCount,"followingsCount" : user.followingsCount,"location":user.city+":"+user.country+"/"+user.location,
                                "postsCount":user.postsCount,"reportsCount":user.reportsCount,"roles":user.roles,"privacy": user.privacy,"gender": user.gender,
                                "profilePictureSet": user.profilePictureSet, "rate": JSON.stringify(user.rate),"views" : parseInt(user.views) });
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
    updateSingleUserInfoInCache:function(userId,attr,value,mode,callback){ // mongodb must change before or after this function updates cache without considering master db
        if(mode==="set"){
            redisClient.hset("info:"+userId,attr,value); // must add to a zset --> points
        }
        else if(mode==="incr"){
            redisClient.hincrby("info:"+userId,attr,value); // must add to a zset --> points
        }   
        redisClient.expire("info:"+userId, 300000);
        console.log("user single info -" + value + "- updated in cache expire 5minutes:");
        return callback(true);
    },
    addToUserFollowingsList:function(user1,user2){
        users.updateSingleUserInfoInCache(user1,"followingsCount",1,"incr",function(result){
            if(result){
                users.updateSingleUserInfoInCache(user2,"followersCount",1,"incr",function(result2){
                    if(result2){
                        userSchema.update({userId: user1}, {
                            $inc: {followingsCount: +1},
                            $addToSet: {followings: user2}
                        }, function (err, result) {
                            if (err) throw err;
                            if (result)
                                console.log(result);
                        });
                        userSchema.update({userId: user2}, {
                            $inc: {followersCount: +1},
                        }, function (err, result) {
                            if (err) throw err;
                            if (result)
                                console.log(result);
                        });
                    }
                    else{
                        console.log("update single cache failed 2");
                    }
                });
            }
            else{
                console.log("update single cache failed 1");
            }
        });
    },
    acceptFollowRequest:function(req,res,user){
        let followObject = {};
        followObject.followId = req.body.followId || null;
        flw.accept(followObject,user.userId,function(callback){
            if(!callback.message){
                addToUserFollowingsList(callback.follower,user.userId);
            }
            else{
                res.send(callback);
            }
        });
    },
    removeFromUserFollowingsList:function(user1,user2){
        users.updateSingleUserInfoInCache(user1,"followingsCount",-1,"incr",function(result){
            if(result){
                users.updateSingleUserInfoInCache(user2,"followersCount",-1,"incr",function(result2){
                    if(result2){
                        userSchema.update({userId: user1},{
                            $inc: {followingsCount: -1},
                            $pull: {followings: user2}
                        },function(err,result){
                            if(err) throw err;
                            if(result)
                                console.log(result);
                        });
                        userSchema.update({userId: user2}, {
                            $inc: {followersCount: -1}
                        },function(err,result){
                            if(err) throw err;
                            if(result)
                                console.log(result);
                        });
                    }
                    else{
                        console.log("update single cache failed 2");
                    }
                });
            }
            else{
                console.log("update single cache failed 1");
            }
        });
    },
    rejectFollowRequest:function(req,res,user){
        let followId = req.body.followId || null;
        flw.reject(followId,user.userId,function(resultr){
            res.send(resultr);
        });
    },
    follow:function(req,res,user){
        let hostId = req.body.followingId || null;
        let type = req.body.type || "user";
        users.getUserInfosFromCache(hostId,function(hostUser){
            if(!hostUser.message){
                if (hostId) {
                    let followObject = {
                        follower: user.userId,
                        type:type,
                        following: hostId,
                    };
                    if (user.followings.indexOf(hostId) === -1) {
                        flw.follow(followObject,hostUser.privacy,function(callback){
                            if(!callback.message){
                                if (!JSON.parse(hostUser.privacy)) {
                                    users.addToUserFollowingsList(user.userId,hostId);
                                }
                            }
                            res.send(callback);
                        });
                    }
                    else {
                        res.send({result: true, message: "already followed"});
                    }
                }
                else {
                    if (!err)
                        res.send({result: false, message: "Bad input"});
                }
            }
            else {
                if (!err)
                    res.send({result: false, message: "404 - user info not found in cache"});
            }
        });
    },
    unfollow:function(req,res,user){
        let hostId = req.body.followingId || null;
        let type = req.body.type || "user";
        if(hostId && user.followings.indexOf(hostId) > -1) {
            if ((typeof hostId ==="string") && user) {
                let unfollowObject = {
                    follower: user.userId,
                    type:type,
                    following: hostId,
                };
                flw.unfollow(unfollowObject,function(callback){
                    users.removeFromUserFollowingsList(user.userId,hostId);
                    res.send(callback);
                });
            }
            else {
                res.send({result: false, message: "Bad input"});
            }
        }
        else{
            res.send({result:true,message:"not followed yet"});
        }
    },
    
    search:function(text){
        
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


