
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

    initialCategoriesInCache = function(mode){
        Cagtegory.initialCategoriesInCache(mode);
    },
    create: function(now,model,brand,callback) {
        Device.Create(now,model,brand,function(resultC){
            return callback(resultC);
        });
    },
    getDefinedCategories: function(req,res) {
        deviceSchema.find({$query:{hour: -1},$orderBy:{counts:1}},{name:1,counts:1,thumbnailUrl:1}, function (err, defCategories) {
            if (err) res.send([]);
                res.send(defCategories);
        });

    }
};


module.exports = devices;