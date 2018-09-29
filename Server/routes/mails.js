var mailer = require("mailer");
var jwt = require('jwt-simple');
var redis = require('redis');
var random = require('randomstring');
var requestIp = require("request-ip");
var CryptoJS = require("crypto-js");
var secret = require('../config/secret');

var redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});
var mails = {

    sendEmail:function(input,title,callback){
        if(input && input.key && input.email){
            console.log(title +" : -->   " + secret.usedProtocol + "/" + secret.webHostName + "/users/verifyEmail/"+input.key + " to  : " + input.email);
            // send email & create a record of sent email , when verified check situation true
            return callback(true);
        }
    },
    parseTemplate : function(data,type,callback) {

    }
};
// private method
function genToken(userId) {
    let expires = expiresIn(1); // 1 day
    let token = jwt.encode({
        exp: expires,
        key: accessToken
    }, secret.userIdKey);

    return {
        token: token,
    };
}

function expiresIn(numDays) {
    let dateObj = new Date();
    return dateObj.setDate(dateObj.getDate() + numDays);
}






module.exports = mails;