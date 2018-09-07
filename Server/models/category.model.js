const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var redis = require("redis");

var redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");


});

var categorySchema = new Schema({
    name : String,
    counts:Number,
    thumbnailUrl:String,
    hour:Number, // -1 - 23
    day:Number, // -1 - 31
    createdAt:Number,
    updatedAt:Number,
    activated:Boolean,
    deleted:Boolean,
});

// index by hour then counts then names
// Category.createIndex({name:1,createdAt:1,counts:1},function(err,resultx){
//     if(err) throw err;
//     console.log(resultx);
// });

categorySchema.methods.initialCategoriesInCache = function(hours){
    redisClient.get("categoriesInitialized:"+hours.toString()+"cache",function(err,value) {
        if(err) throw err;
        console.log(value);
        if(!value){
            if (hours === 6 || hours === 24 || hours === 168 || hours === 720) {
                category.find({hour: -1}, {name: 1}, function (err, categories) { // mother categories ... use to initial
                    if (err) throw err;
                    if (categories.length > 0) {
                        let timeLimit = (hours * 3600000) || (4 * 3600000);   // last 24 hours default --> change to 6hours 24hours 1week and 31days for all trends
                        let timeEdge = Date.now() - timeLimit;

                        for (let n = 0; n < categories.length; n++) {
                            category.find({name: categories[n].name, createdAt: {$gt: timeEdge}}, {
                                name: 1,
                                counts: 1
                            }, function (err, cats) {
                                if (err) throw err;
                                if (cats.length > 0) {
                                    console.log(cats.length);

                                    for (let z = 0; z < cats.length; z++) {
                                        let countsX = cats[z].counts;
                                        if (cats[z].hour !== -1) {
                                            redisClient.zincrby("categoriesTrend:" + hours.toString() + "cache", cats[z].counts, cats[z].name, function (err, resultm) {
                                                console.log(resultm + " / count  " + cats[z].counts + " / name : " + cats[z].name);
                                            });
                                        }
                                        if ((z === cats.length - 1) && (n === 0)) {
                                            console.log("set to initilized for an hour");
                                            let expireTime = (((hours / 6) * 3600000) - 30000); // -30 seconds --> maximum code delay or shit for now
                                            redisClient.set("categoriesInitialized:" + hours.toString() + "cache", true);
                                            redisClient.expire("categoriesTrend:" + hours.toString() + "cache", expireTime); // expire
                                            redisClient.expire("categoriesInitialized:" + hours.toString() + "cache", expireTime);
                                        }
                                    }
                                }
                                else {
                                    //nop
                                }
                            });
                        }
                        // switch expire time with modes
                    }
                    else {
                        console.log("no category found " + hours);
                    }
                });
            }
            else {
                console.log("Bad input for categories expire cached");
            }
    }
    else{
            console.log("Already Initialized The Categories Cache for "+hours + " hours");
        }
    });
};

categorySchema.methods.Create = function(now,mode,categoryName,callback) {
    console.log(categoryName);
    if((categoryName) && (typeof categoryName === "string") && (categoryName.length > 0)) {
        let hours = now.getHours();
        let day = now.getDay();
        let nowTime = now.getTime();
        let windowEdge = (now.getTime() - 3600000 + 60000); // 59 minutes before
        if (mode === -1) {
            category.findOne({name:categoryName,hour:mode,day:mode},function(err,resultc){
                if(err) throw err;
                if(!resultc) {
                    let newCategory = new Category({name: categoryName});
                    newCategory.createdAt = nowTime;
                    newCategory.updatedAt = nowTime;
                    newCategory.hour = mode;
                    newCategory.day = mode;
                    newCategory.thumbnailUrl="../profilePics/avatar.png"; // 
                    newCategory.counts = 0;
                    newCategory.name = categoryName;
                    newCategory.activated = true;
                    newCategory.deleted = false;
                    newCategory.save();
                    return callback(true);
                }
                else{
                    return callback({result:false,message:"Already exists category : "+categoryName});
                }
            })
        }
        else {
                //
                if(mode === 0){
                    day = -1;
                }
                else if(mode === 1){
                    hours = -1;
                }
                category.update({name:categoryName,hour:-1,day:-1},{$inc:{counts:1},$set:{updatedAt:nowTime}},function(err,value){ 
                    if(err) throw err;
                    if(value.n > 0){
                        category.update({
                        name: categoryName,
                        hour: hours,
                        day:day,
                        createdAt: {$gt: windowEdge}
                    },{$inc: {counts: 1},$set:{updatedAt:nowTime}}, function (err, resultx) {
                        if (err) throw err;
                        if (resultx.n === 0) {
                            let newCategory = new Category({name: categoryName});
                            newCategory.createdAt = nowTime;
                            newCategory.updatedAt = nowTime;
                            newCategory.counts = 1;
                            newCategory.name = categoryName;
                            newCategory.thumbnailUrl=""; // 
                            if(mode === 0){
                                newCategory.hour = hours;
                                newCategory.day = -1;
                            }
                            else if(mode === 1){
                                newCategory.day = day;
                                newCategory.hour = -1;
                            }
                            newCategory.activated = true;
                            newCategory.deleted = false;
                            newCategory.save(function (err, result) {
                                if(err) throw err;
                                if (result) {
                                    redisClient.zincrby("categoriesTrend:6cache", 1, categoryName, function (err, counts) { // hourly 1time per hour
                                        if (err) throw err;
                                        if(counts.toString() === "1"){
                                            redisClient.set("categoriesInitialized:6cache",false);
                                        }
                                        redisClient.zincrby("categoriesTrend:24cache", 1, categoryName, function (err, counts2) { // daily 1time per 6 hours
                                            if (err) throw err;
                                            if(counts2.toString() === "1"){
                                                redisClient.set("categoriesInitialized:24cache",false);
                                            }
                                            redisClient.zincrby("categoriesTrend:168cache", 1, categoryName, function (err, counts3) { // daily 1time per 12hours
                                                if (err) throw err;
                                                if(counts3.toString() === "1"){
                                                    redisClient.set("categoriesInitialized:168cache",false);
                                                }
                                                redisClient.zincrby("categoriesTrend:720cache", 1, categoryName, function (err, counts4) { // daily 1time per 12hours
                                                    if (err) throw err;
                                                    if(counts4.toString() === "1"){
                                                        redisClient.set("categoriesInitialized:720cache",false);
                                                    }
                                                    callback(true);
                                                });
                                            });
                                        });
                                    });
                                }
                                else {
                                    callback(false);
                                }
                            });
                        }
                        else {
                            redisClient.zincrby("categoriesTrend:6cache", 1, categoryName, function (err, counts) { // hourly 1time per hour
                                if (err) throw err;
                                if(counts.toString() === "1"){
                                    redisClient.set("categoriesInitialized:6cache",false);
                                }
                                redisClient.zincrby("categoriesTrend:24cache", 1, categoryName, function (err, counts2) { // daily 1time per 6 hours
                                    if (err) throw err;
                                    if(counts2.toString() === "1"){
                                        redisClient.set("categoriesInitialized:24cache",false);
                                    }
                                    redisClient.zincrby("categoriesTrend:168cache", 1, categoryName, function (err, counts3) { // daily 1time per 12hours
                                        if (err) throw err;
                                        if(counts3.toString() === "1"){
                                            redisClient.set("categoriesInitialized:168cache",false);
                                        }
                                        redisClient.zincrby("categoriesTrend:720cache", 1, categoryName, function (err, counts4) { // daily 1time per 12hours
                                            if (err) throw err;
                                            if(counts4.toString() === "1"){
                                                redisClient.set("categoriesInitialized:720cache",false);
                                            }
                                            callback(true);
                                        });
                                    });
                                });
                            });
                        }
                    });
                }
                else{
                    callback({result:false,message:"Category : '"+ categoryName +"' is not defined yet"});
                }
            });
        }
    }
    else{
        callback({result:false,message:"Bad Input"});
    }
};


let Category = mongoose.model('categories', categorySchema);
let category = mongoose.model('categories');
module.exports = category;