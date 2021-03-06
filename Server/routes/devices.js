
const mongoose = require('mongoose');
var deviceSchema = require('../models/device.model');
var Device = new deviceSchema();
var redis = require('redis');
var redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});
/* GET home page. */
var devices = {

    initialDevicesInCache: function(mode){
        Device.initial(mode);
    },
  
    create: function(brand,model,callback) {
        let now = new Date();
        Device.Create(now,0,brand,model,function(resultC){
            Device.Create(now,1,brand,model,function(resultC){
                Device.Create(now,3,brand,model,function(resultC){
                    return callback(true);
                });
            });
        });
    },
};


module.exports = devices;