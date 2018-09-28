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
            if((mode) && (mode > -1) && (mode <= 4)){
                
                let now = new Date.now();
                let thisHour = now.getHours();
                let thisDay = now.getDay();
                let thisMonth = now.getMonth();
                let thisYear = now.getYear() + 1900;
                let now = new Date.now();
                query.hour = thisHour;
                
                let timeLimit = (1 * 3600000);   // 1h
                if(mode === 0){
                    if(thisHour > 0){
                        query.hour = {$in:[thisHour,thisHour-1]};
                    }
                    else{
                        query.hour = {$in:[thisHour,23]};
                    }
                }
                else if(mode===1){ // day
                    timeLimit = (24 * 3600000);
                    query.hour = -1;
                    if(thisDay > 1){
                        query.day = {$in:[thisDay,thisDay-1]};
                    }
                    else{
                        query.day = {$in:[thisDay,30]};
                    }
                }
                else if(mode===2){ // week // 1/3 hafte bzane 
                    timeLimit = (7 * 24 * 3600000);
                    query.hour = -1;
                    var days = [];
                    for(var z = 0 ; z < 7 ;z++){
                        if(thisDay > z){
                            days.push(thisDay - z);
                        }
                        else{
                            days.push(30 - (z - thisDay));
                        }
                    }
                    query.day = {$in:days};
                }
                else if(mode===3){ // (har hafte bzane) startings 1/4 month initial bzane amalan ke unke akhare mahe ruze 30 akhario bzane record
                    query.hour = -1;
                    query.day = -1;
                    timeLimit = (30 * 24 * 3600000);
                    if(thisMonth > 1){
                        query.month = {$in:[thisMonth, (thisMonth-1)]};
                    }
                    else{
                        query.month = {$in:[thisMonth, 12]};
                        query.year = {$in:[thisYear,(thisYear-1)]};
                    }
         
                }
                else if(mode===4){ // year not initial at first
                    timeLimit = (12 * 30 * 24 * 3600000);
                    query.hour = -1;
                    query.day = -1;
                    query.month = {$exists:true}; // category counts for each month ... last 12 months
                    query.year = {$gte:(thisYear-1)};
                }
                if(mode === 0){
                    query.hour = -1;
                }
                let timeEdge = now.getTime() - timeLimit;
                query.name = categories[n].name;
                query.updatedAt = {$gt: timeEdge}};
                for (let n = 0; n < categories.length; n++) {
                    category.find(query, {
                        name: 1,
                        counts: 1
                        }, function (err, cats) {
                        if (err) throw err;
                        if (cats.length > 0) {
                            console.log(cats.length);
                            redisClient.del("categoriesTrend:"+mode,function(result){
                                redisClient.set("categoriesInitialized:"+mode, true);
                                for (let z = 0; z < cats.length; z++) {
                                    let countsX = cats[z].counts;
                                    if(parseInt(result)===1){
                                        Category.updateCategoryTrendsInCache(mode,categoryName.toLowerCase(),countsX,function(resultu){
                                            if(resultu){
                                                if ((z === cats.length - 1) && (n === 0)) {
                                                    console.log("categories initialized for mode = :" + mode  +" in cache.");
                                                    if ((z === cats.length - 1) && (n === 0)) {
                                                        let expireTime = (timeLimit + 30000); // + 30 seconds --> maximum code delay or shit for now
                                                        redisClient.set("categoriesInitialized:"+mode, true);
                                                        redisClient.expire("categoriesTrend:"+mode, expireTime); // expire
                                                        redisClient.expire("categoriesInitialized:"+mode, expireTime);
                                                    }
                                                }
                                            }
                                           
                                        }); 
                                    }
                                }
                            });
                        }
                        else {
                            //nop
                        }
                    });
                }
            }
        });
                // switch expire time with mode
};

categorySchema.methods.Create = function(now,mode,categoryName,callback) {
    console.log(categoryName);
    if((categoryName) && (typeof categoryName === "string") && (categoryName.length > 0)) {
        let hours = now.getHours();
        let day = now.getDay();
        let month = now.getMonth();
        let year = now.getYear() + 1900;
        let nowTime = now.getTime();
        
        if (mode === -1) {
            category.findOne({name:categoryName.toLowerCase(),hour:mode,day:mode,year:mode,month:mode},function(err,resultc){
                if(err) throw err;
                if(!resultc) {
                    let newCategory = new Category({name: categoryName});
                    newCategory.createdAt = nowTime;
                    newCategory.updatedAt = nowTime;
                    newCategory.hour = mode, // -1 - 23
                    newCategory.day = mode, // -1 - 31
                    newCategory.month = mode, // -1 - 12
                    newCategory.year = mode, // -1 , 2019 --> 
                    newCategory.thumbnailUrl="../profilePics/avatar.png"; // 
                    newCategory.counts = 0;
                    newCategory.name = categoryName.toLowerCase();
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
                
            category.update({name:categoryName.toLowerCase(),hour:-1,day:-1,month:-1,year:-1},{$inc:{counts:1}},function(err,value){ 
                if(err) throw err;
                if(value.n > 0){
                    let query = {
                        name: categoryName.toLowerCase(),
                        hour: hours,
                        day:day,
                        month:month,
                        year:year
                    };
                    let timeLimit = (1 * 3600000);
                    if(mode === 0){
                        
                    }
                    else if(mode === 1 || mode === 2){
                        query.hours = -1;
                        if(mode === 1){
                            timeLimit = (24 * 3600000);
                        }
                        else{
                            timeLimit = (7 * 24 * 3600000);
                        }
                    }
                    else if(mode === 3){
                        timeLimit = (30 * 24 * 3600000);
                        query.hours = -1;
                        query.day = -1;
                    }
                    else if(mode === 4){
                        timeLimit = (12 * 30 * 24 * 3600000);
                        query.hours = -1;
                        query.day = -1;
                        query.month = -1;
                    }
                    query.updatedAt = {$gt: (nowTime - (timeLimit+(30000)))};

                    Post.updateCategoryTrendsInCache(mode,1,function(updateResponse){
                        category.update(query,
                            {$inc: {counts: 1},$set:{updatedAt:nowTime}}, function (err, resultx) {
                            if (err) throw err;
                            if (resultx.n === 0) {
                                let newCategory = new Category({name: categoryName.toLowerCase()});
                                newCategory.createdAt = nowTime;
                                newCategory.updatedAt = nowTime;
                                newCategory.counts = 1;
                                newCategory.name = categoryName.toLowerCase();
                                newCategory.thumbnailUrl=""; // 
                                newCategory.hours = hours;
                                newCategory.day = day;
                                newCategory.month = month;
                                newCategory.year = year;
                                if(mode === 0){
                        
                                }
                                else if(mode === 1 || mode === 2){
                                    newCategory.hours = -1;
                                }
                                else if(mode === 3){
                                    newCategory.hours = -1;
                                    newCategory.day = -1;
                                }
                                else if ( mode === 4){
                                    newCategory.hours = -1;
                                    newCategory.day = -1;
                                    newCategory.month = -1;
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


                        if(updateResponse){
                            return callback(true);
                        }   
                        else{
                            console.log("update category trends cache in mode " + mode +" failed!");
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
categorySchema.methods.updateCategoryTrendsInCache = function(type,categoryName,incValue,callback){
    let increaseValue = incValue || 1;
    if((type) && ((type > -1) && type <= 4)) {
        redisClient.zincrby("categoriesTrend:"+type, increaseValue, categoryName, function (err, counts) { // 0 = day , 1 = days , 2 = month
            if (err) throw err;
            if(counts.toString() === "1"){

                redisClient.expire("categoriesTrend:"+mode,expireTime);
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

