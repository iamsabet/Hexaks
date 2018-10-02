
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
    initialCategoriesInCache:function(mode){
        Cagtegory.initial(mode);
    },
    addNewCategory: function(req, res,user) {
        let now = new Date();
        Cagtegory.Create(now,-1,req.body.category,function(callback){
            res.send(callback);
        });
    },
    addCategory: function(now,categoryName,callback) {
        Cagtegory.Create(now,0,categoryName,function(result1){
            if(result1){
                console.log("hour record category = " + categoryName);
                Cagtegory.Create(now,1,categoryName,function(result2){
                    if(result2){
                        console.log("day record category = " + categoryName);
                        Cagtegory.Create(now,3,categoryName,function(result3){
                            if(result3){
                                console.log("month record category = " + categoryName);
                                return callback(true);
                            }
                        });
                    }
                });
            }
        });
    },
    getDefinedCategories: function(req,res) {
        categorySchema.find({$query:{hour: -1},$orderBy:{counts:1}},{name:1,counts:1,thumbnailUrl:1}, function (err, defCategories) {
            if (err) res.send([]);
                res.send(defCategories);
        });

    }
};


module.exports = categories;