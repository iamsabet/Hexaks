
const mongoose = require('mongoose');
var deviceSchema = require('../models/category.model');
var Device = new categorySchema();
var redis = require('redis');
var redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});
/* GET home page. */
var devices = {

    initialDevicesInCache = function(mode){
        Device.initial(mode);
    },
    create: function(brand,model,callback) {
        let now = new Date();
        Device.Create(now,brand,model,function(resultC){
            return callback(resultC);
        });
    },
};


module.exports = devices;