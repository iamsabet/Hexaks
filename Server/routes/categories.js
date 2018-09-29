
const mongoose = require('mongoose');
var categorySchema = require('../models/category.model');
var Cagtegory = new categorySchema();
var redis = require('redis');
var redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});
/* GET home page. */
var categories = {

    addNewCategory: function(req, res,user) {
        let now = new Date();
        Cagtegory.Create(now,-1,req.body.category,function(callback){
            res.send(callback);
        });
    },
    addCategory: function(now,mode,categoryName,callback) {
        let now = new Date();
        Cagtegory.Create(now,mode,categoryName,function(resultC){
            return callback(resultC);
        });
    },
    getDefinedCategories: function(req,res) {
        categorySchema.find({$query:{hour: -1},$orderBy:{counts:1}},{name:1,counts:1,thumbnailUrl:1}, function (err, defCategories) {
            if (err) res.send([]);
                res.send(defCategories);
        });

    },
    updateCategoryTrendsInCache :function(type,categoryName,incValue,callback){
        let increaseValue = incValue || 1;
        if((type) && ((type > -1) && type <= 4)) {
            redisClient.zincrby("categoriesTrend:"+type, increaseValue, categoryName, function (err, counts) { // 0 = day , 1 = days , 2 = month
                if (err) throw err;
                if(counts.toString() === "1"){
                    return callback(true);
                }
            });
        }
    }
};


module.exports = categories;