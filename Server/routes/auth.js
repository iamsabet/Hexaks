var jwt = require('jwt-simple');
var userSchema = require('../models/user.model');
var bcrypt = require("bcrypt-nodejs");
var redis = require('redis');
var random = require('randomstring');
var usrs = require("./users");
var redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});
var auth = {

    login: function(req, res) {

        var username = req.body["username"] || '';
        var password = req.body["password"] || '';
        console.log(username + " --- " + password);
        if (username === '' || password === '') {
            res.status(401);
            res.json({
                "status": 401,
                "message": "Invalid credentials"
            });
            return;
        }

        // Fire a query to your DB and check if the credentials are valid
        auth.validate(username, password,function(callback){
            var userDbObject = callback;
            redisClient.hgetall(userDbObject.userId+":info",function(err,info) {
                if (!err && !info) {
                    redisClient.hmset([userDbObject.userId+":info","username",userDbObject.username, "privacy", userDbObject.privacy,"emailVerified",userDbObject.emailVerified,
                            "profilePictureSet",userDbObject.profilePictureSet,"profilePictureUrls",userDbObject.profilePictureUrls,"phoneVerified",userDbObject.phoneVerified,"blockList",[],"rate",userDbObject.rate]); // must add to a zset --> points
                }
            });
            redisClient.set(userDbObject.username + ":userId",userDbObject.userId);
            usrs.extendExpiration(userDbObject);
            if (!userDbObject) { // If authentication fails, we send a 401 back
                res.status(401);
                res.json({
                    "status": 401,
                    "message": "Invalid credentials"
                });
                return;
            }

            if (userDbObject) {
                res.send(genToken(userDbObject));
            }
        });



    },

    validate: function(username, password,callback) {
        // spoofing the DB response for simplicity

        userSchema.findOne({username:username,password:password},{_id:0,userId:1,username:1,blockList:1,interestCategories:1,favouriteProfiles:1,profilePictureSet:1,profilePictureUrls:1,privacy:1,emailVerified:1,rate:1,phoneVerified:1},function(err,user) {
            if (err) throw err;
            if (user) {
                return callback(user);
            }
            else {
                userSchema.findOne({email: username}, {
                    _id: 0,
                    userId: 1,
                    username: 1,
                    profilePictureUrl: 1
                }, function (err, userf) {
                    if (err) throw err;
                    if (userf) {
                        return callback(userf);
                    }
                    else {
                        return callback(null);
                    }
                });
            }
        });
    },

    validateUser: function(key,callback) {
        // spoofing the DB response for simplicity
        userSchema.findOne({userId: key}, {
            password: 0,
        }, function (err, user) {
            if (err) throw err;
            if (user) {
                return callback(user);
            }
            else {
                return null;
            }
        });
    }
};
// private method
function genToken(user) {
    var expires = expiresIn(1); // 1 days
    var token = jwt.encode({
        exp: expires,
    }, require('../config/secret')());

    return {
        token: token,
        key : user["userId"],
        username : user["username"]
    };
}

function expiresIn(numDays) {
    var dateObj = new Date();
    return dateObj.setDate(dateObj.getDate() + numDays);
}

module.exports = auth;