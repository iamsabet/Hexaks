var jwt = require('jwt-simple');
var userSchema = require('../models/user.model');
var redis = require('redis');
var random = require('randomstring');
var usrs = require("./users");
var requestIp = require("request-ip");
var CryptoJS = require("crypto-js");
let secret = require('../config/secret');
var redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});
var auth = {

    login: function(req, res) {
        if(req.body["info"]) {
            let encryptedInfo = req.body["info"];
            let clientIp = requestIp.getClientIp(req);
            redisClient.get("loginKey:"+clientIp, function (err, key) {
                console.log(key);
                if (err) res.send({result: false, message: "key did not found in cache"});
                if (!key) {
                    res.send({result: false, message: "login key expired", status: 400});
                }
                else {
                    let bytes  = CryptoJS.AES.decrypt(encryptedInfo, key);
                    console.log("bytes : "+bytes);
                    let decrypted = bytes.toString(CryptoJS.enc.Utf8);
                    if(decrypted) {
                        let username = decrypted.split("/")[0].toLowerCase();
                        let password = decrypted.split("/")[1];

                        console.log(username + " --- " + password);
                        if (username === '' || password === '') {
                            res.send({
                                result: false,
                                "status": 401,
                                "message": "Invalid credentials"
                            });
                        }
                        else{
                            // Fire a query to your DB and check if the credentials are valid
                            auth.validate(username, password, function (callback) {
                                let userDbObject = callback;
                                if (callback && !callback.message) {
                                    usrs.getUserInfosFromCache(userDbObject.userId,function(hostUserInfo){
                                        if(!hostUserInfo.message){
                                            if (!userDbObject) { // authentication failed
                                                res.send({
                                                    result: false,
                                                    status:401,
                                                    message: "username (or email) / password is incorrect"
                                                });
                                                return;
                                            }
                                            else{
                                                redisClient.set("userId:"+userDbObject.username, userDbObject.userId);
                                                usrs.extendExpiration(userDbObject);
                                                res.send(genToken(userDbObject.userId));
                                            }
                                        }
                                        else{
                                            res.send(hostUserInfo);
                                        }
                                    });
                                }
                                else {
                                    res.send(callback);
                                }
                            });
                        }
                    }
                    else{
                        res.send({result:false,message:"Invalid Credentials"});
                    }
                }
            });
        }
        else{
            res.send({result:false,message:"504 bad request",status:504});
        }
    },

    validate: function(username, password,callback) {
        // spoofing the DB response for simplicity

        userSchema.findOne({$or: [{username: username}, {email: username}]},{_id:0,userId:1,username:1,password:1,fullName:1,gender:1,followingsCount:1,followersCount:1,followings:1,postsCounts:1,blockList:1,interestCategories:1,favouriteProfiles:1,profilePictureSet:1,profilePictureUrls:1,privacy:1,phone:1,verified:1,rate:1},function(err,user) {
            if (err) throw err;
            if (user) {
                let hashPassword = CryptoJS.HmacSHA512(user.userId,password).toString();
                console.log("pass1 :" + user.password , "\n pass2 :" + hashPassword);
                if (user.password === hashPassword) {
                    return callback(user);
                }
                else {
                    return callback({result:false,message:"Username or password incorrect"});
                }
            }
            else {
                return callback({result:false,message:"Username or password incorrect"});
            }
        });
    },
    validateUser: function(key,callback) {
        // spoofing the DB response for simplicity
        if(key.startsWith("after")){
            return callback(genToken(key.split("Register")[1]));
        }
        else {
            userSchema.findOne({userId: key}, {
                password: 0,
            }, function (err, user) {
                if (err) throw err;
                if (user) {
                    return callback(user);
                }
                else {
                    return callback({result: true, message: "Not Authenticated", status: 401});
                }
            });
        }
    }

};
// private method
function genToken(userId) {
    let expires = expiresIn(1); // 1 day
    let token = jwt.encode({
        exp: expires,
        key: userId
    }, secret.userIdKey);

    return {
        token: token,
    };
}

function expiresIn(numDays) {
    let dateObj = new Date();
    return dateObj.setDate(dateObj.getDate() + numDays);
}

module.exports = auth;
