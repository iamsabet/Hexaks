const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var redis = require("redis");
var mongoosePaginate = require('mongoose-paginate');
var autoIncrement = require('mongoose-sequence')(mongoose);

var redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");


});

var categorySchema = new Schema({
    id:Number,
    name : String,
    counts:Number,
    thumbnailUrl:String,
    hour:Number, // 0 - 23
    day:Number, // 0 - 31
    month : Number, // 0 - 12
    year:Number, // 0 , 2019 --> 
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

categorySchema.methods.initialCategoriesInCache = function(mode){
    redisClient.get("categoriesTrendInitialized:"+mode,function(err,value) {
        if(err) throw err;
        console.log(value);
        if(!value){
            if((mode) && ((mode > -1) && mode <= 4)) {
                let timeLimit = (1 * 3600000) || (2 * 3600000);   // last 24 hours default --> change to 6hours 24hours 1week and 31days for all trends
                let now = new Date.now();
                let thisHour = now.getHours();
                let thisDay = now.getDay();
                let thisMonth = now.getMonth();
                let thisYear = now.getYear();
                let now = new Date.now();
                if(mode === 0){
                    query.hour = thisHour;
                    query.day = -1;
                    query.month = -1;
                    query.year = -1;
                }
                else if(mode===1){ // day
                    timeLimit = (24 * 3600000);
                    query.hour = -1;
                    query.day = thisDay;
                    query.month = -1;
                    query.year = -1;
                }
                else if(mode===2){ // week
                    timeLimit = (7 * 24 * 3600000);
                    query.hour = -1;
                    query.month = -1;
                    query.year = -1;
                    var days = [];
                    for(var z = 0 ; z < 7 ;z++){
                        if(thisDay > z){
                            days.push(thisDay - z);
                        }
                        else{
                            days.push(31 - (z - thisDay));
                        }
                    }
                    query.day = {$in:days};
                }
                if(mode===3){ // month
                    timeLimit = (30 * 7 * 24 * 3600000);
                    timeLimit = (7 * 24 * 3600000);
                    query.hour = -1;
                    query.month = -1;
                    query.year = -1;
                    query.month = {$in:[thisMonth, (thisMonth-1)]};
                }
                else if(mode===4){ // year
                    // timeLimit = (12 * 31 * 7 * 24 * 3600000);
                    // newCategory.year = year;
                    // newCategory.day = -1;
                    // newCategory.month = -1;
                    // newCategory.hour = -1;
                }
                
                let timeEdge = now.getTime() - timeLimit;

                let query = {name: categories[n].name, createdAt: {$gt: timeEdge}};
                if(mode === 0){
                    query.hour = -1;
                }
                
                for (let n = 0; n < categories.length; n++) {
                    category.find(query, {
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
        let month = now.getMonth();
        let year = now.getYear() + 1900;
        let nowTime = now.getTime();
        let windowEdge = (now.getTime() - 3600000 + 60000); // 59 minutes before
        if (mode === -1) {
            category.findOne({name:categoryName,hour:mode,day:mode},function(err,resultc){
                if(err) throw err;
                if(!resultc) {
                    let newCategory = new Category({name: categoryName});
                    newCategory.createdAt = nowTime;
                    newCategory.updatedAt = nowTime;
                    newCategory.hour = mode, // 0 - 23
                    newCategory.day = mode, // 0 - 31
                    newCategory.month = mode, // 0 - 12
                    newCategory.year = mode, // 0 , 2019 --> 
                    newCategory.thumbnailUrl="../profilePics/avatar.png"; // 
                    newCategory.counts = 0;
                    newCategory.name = categoryName.toString();
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
                
            category.update({name:categoryName,hour:-1,day:-1,month:-1,year:-1},{$inc:{counts:1}},function(err,value){ 
                if(err) throw err;
                if(value.n > 0){
                    Post.updateCategoryTrendsInCache(mode,1,function(updateResponse){
                        category.update({
                            name: categoryName,
                            hour: hours,
                            day:day,
                            month:month,
                            year:year,
                            month:month,
                            createdAt: {$gt: windowEdge}
                            },
                            {$inc: {counts: 1}}, function (err, resultx) {
                            if (err) throw err;
                            if (resultx.n === 0) {
                                let newCategory = new Category({name: categoryName});
                                newCategory.createdAt = nowTime;
                                newCategory.updatedAt = nowTime;
                                newCategory.counts = 1;
                                newCategory.name = categoryName.toString();
                                newCategory.thumbnailUrl=""; // 
                                if(mode === 0){
                                    newCategory.hours = hours
                                    newCategory.day = -1;
                                    newCategory.year = -1;
                                    newCategory.month = -1;
                                }
                                else if(mode === 1){
                                    newCategory.day = day;
                                    newCategory.year = -1;
                                    newCategory.month = -1;
                                    newCategory.hours = -1;
                                }
                                
                                else if(mode === 3){
                                    newCategory.month = month;
                                    newCategory.day = -1;
                                    newCategory.year = -1;
                                    newCategory.hours = -1;
                                }
                                else if(mode === 4){
                                    newCategory.year = year;
                                    newCategory.day = -1;
                                    newCategory.month = -1;
                                    newCategory.hours = -1;
                                }
                                newCategory.activated = true;
                                newCategory.deleted = false;
                                newCategory.save(function (err, resultc) {
                                    if(err) throw err;
                                    if (resultc) {
                                        return callback(true);
                                    }
                                    else {
                                        return callback({result:false,message:"create category in mode " + mode +" failed!"});
                                    }
                                });
                            }
                        });
                    });
                    if(updateResponse){
                        return callback(true);
                    }   
                    else{
                        console.log("update category trends cache in mode " + mode +" failed!");
                    }
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
categorySchema.methods.updateCategoryTrendsInCache = function(type,incValue,callback){
    let increaseValue = incValue || 1;
    if((type) && ((type > -1) && type <= 4)) {
        redisClient.zincrby("categoriesTrend:"+type, increaseValue, categoryName, function (err, counts) { // 0 = day , 1 = days , 2 = month
            if (err) throw err;
            if(counts.toString() === "1"){
                redisClient.set("categoriesTrendInitialized:"+type,false);
                return callback(true);
            }
        });
    }
};


categorySchema.plugin(autoIncrement, {inc_field: 'id'});mongoosePaginate
categorySchema.plugin(mongoosePaginate);
let Category = mongoose.model('categories', categorySchema);
let category = mongoose.model('categories');
module.exports = category;