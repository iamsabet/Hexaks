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
var admins = {
    decryptData : function(req,res,user,callback){
        redisClient.get("adminKey:"+user.userId, function (err, key) {
            console.log(key);
            if (err) res.send({result: false, message: "key did not found in cache"});
            if (!key) {
                res.send({result: false, message: "login key expired", status: 400});
            }
            else {
                let bytes  = CryptoJS.AES.decrypt(req.body.input, key);
                let decrypted = bytes.toString(CryptoJS.enc.Utf8);
                if(decrypted) {
                    return (JSON.parse(decrypted));
                }
                else{
                    console.log(decrypted);
                    return({result:false,message:"Admin Key Not Found , or Expired"});
                }
            }
        })
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
module.exports = admins;

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


