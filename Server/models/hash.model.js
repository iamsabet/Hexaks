const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var redis = require("redis");
var CryptoJS = require("crypto-js");
var redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});
var Float = require('mongoose-float').loadType(mongoose);
var long = require('mongoose-long')(mongoose);
var mongoosePaginate = require('mongoose-paginate');
var autoIncrement = require('mongoose-sequence')(mongoose);


var hashesSchema = new Schema({ // create index on onesPositionString --> to query here db.hashes.find({$text:{$search:"positionString"}},{score:{$meta:"textScore"}}).sort({score:{$meta:"textScore"}}).limit(3).pretty();
 
    hash_id:Number,
    value:String, // hash value
    biranyHashString:String, // " 0 1 1 0 1 1 0 "
    onesPositionString:String, // " 1 2 4 5 "
    ownerId : String,
    referenceId:String, // postId , ... 
    referenceType:String, // post(image / clrearly) ,  not sure what im thinking right now //blog , new ... message ... feedback anyshit 
    activated:Boolean,
    deleted: Boolean,
    createdAt : Number,
    updatedAt : Number
});
// index

hashesSchema.methods.initial = function(){
    redisClient.get("devicesInitialized:"+mode,function(err,value) {
        if(err) throw err;
        console.log(value);
        if(!value){
            let query = {};
            if((mode) && (mode > -1) && (mode <= 4)){
                query = {};
                let now = new Date();
                let thisHour = now.getHours();
                let thisDay = now.getDay();
                let thisMonth = now.getMonth();
                let thisYear = now.getYear() + 1900;

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
                
                let timeEdge = now.getTime() - timeLimit;
                // query.name = devices[n].name;
                query.updatedAt = {$gt: timeEdge}};

                device.find(query, {
                    model: 1,
                    brand:1,
                    counts: 1,
                    number:1
                    }, function (err, devs) {
                    if (err) throw err;
                    if (devs.length > 0) {
                        console.log(devs.length);
                        redisClient.del("devicesTrend:"+mode,function(result){
                            redisClient.set("devicesInitialized:"+mode, true);
                            for (let z = 0; z < devs.length; z++) {
                                let countsX = devs[z].counts;
                                updateDeviceTrendsInCache(mode,devs[z].brand+"/"+devs[z].model,countsX,function(resultu){
                                    if(resultu){
                                        updateDeviceBrandsTrendsInCache(mode,devs[z].brand,countsX,function(resultux){
                                            if(resultux){
                                                if ((z === devs.length - 1)) {
                                                    console.log("devices initialized for mode = :" + mode  +" in cache.");
                                                    if ((z === devs.length - 1)) {
                                                        let expireTime = (timeLimit + 30000); // + 30 seconds --> maximum code delay or shit for now
                                                        redisClient.set("devicesInitialized:"+mode, true);
                                                        redisClient.expire("devicesTrend:"+mode, expireTime); // expire
                                                        redisClient.expire("devicesInitialized:"+mode, expireTime);
                                                    }
                                                }   
                                            }
                                        }); 
                                    }
                                });
                            }
                        });
                    }
                    else {
                        console.log("No devices found in initial mode : " + mode);
                    }
                });
                
            }
        });
                // switch expire time with mode
};

deviceSchema.methods.Create = function(now,mode,brand,model,callback) {
    
    if((model) && (typeof model === "string") && (model.length > 0)&& (brand) && (typeof brand === "string") && (brand.length > 0)) {
        let hours = now.getHours();
        let day = now.getDay();
        let month = now.getMonth();
        let year = now.getYear() + 1900;
        let nowTime = now.getTime();
        let x = -2;
        if(mode===0){
            x= -1;
        }
        device.updateOne({model:model.toLowerCase(),brand:brand.toLowerCase(),hour:x,day:x,month:x,year:x},{$inc:{counts:1}},function(err,value){ 
            if(err) throw err;
            if((value.n === 0) && (x === -1)){
                let newDevice = new Device({model:model.toLowerCase(),brand: brand.toLowerCase()});
                        newDevice.createdAt = nowTime;
                        newDevice.updatedAt = nowTime;
                        newDevice.counts = 1;
                        newDevice.model = model.toLowerCase();
                        newDevice.brand = brand.toLowerCase(),
                        newDevice.thumbnailUrl=""; // 
                        newDevice.hour = -1;
                        newDevice.day = -1;
                        newDevice.month = -1;
                        newDevice.year = -1;
                        newDevice.activated = true;
                        newDevice.deleted = false;
                        newDevice.setNext('device_id', function(err, cmt){
                            if(err) throw err;
                            newDevice.save(function (err, resultc) {
                                if(err) throw err;
                                if (resultc) {
                                    console.log("master device item created");
                                }
                                else {
                                    console.log("master device item create failed!");
                                }
                            });
                        });
            }
            let query = {
                model: model.toLowerCase(),
                brand: brand.toLowerCase(),
                hour: hours,
                day:day,
                month:month,
                year:year
            };
            let timeLimit = (1 * 3600000);
            if(mode === 0){
                
            }
            else if(mode === 1 || mode === 2){
                query.hour = -1;
                if(mode === 1){
                    timeLimit = (24 * 3600000);
                }
                else{
                    timeLimit = (7 * 24 * 3600000);
                }
            }
            else if(mode === 3){
                timeLimit = (30 * 24 * 3600000);
                query.hour = -1;
                query.day = -1;
            }
            else if(mode === 4){
                timeLimit = (12 * 30 * 24 * 3600000);
                query.hour = -1;
                query.day = -1;
                query.month = -1;
            }
            
            query.updatedAt = {$gt: (nowTime - (timeLimit+(30000)))};
            updateDeviceTrendsInCache(mode,query.model+"/"+query.brand,1,function(updateResponse){
                device.updateOne(query,
                    {$inc: {counts: 1},$set:{updatedAt:nowTime}
                    }, function (err, resultx) {
                    if (err) throw err;
                    if (resultx.n === 0) {
                        let newDevice = new Device({model: query.model,brand:query.brand});
                        newDevice.createdAt = nowTime;
                        newDevice.updatedAt = nowTime;
                        newDevice.counts = 1;
                        newDevice.name = query.model;
                        newDevice.name = query.brand;
                        newDevice.thumbnailUrl=""; // 
                        newDevice.hour = query.hour;
                        newDevice.day = query.day;
                        newDevice.month = query.month;
                        newDevice.year = query.year;
                        if(mode === 0){
                
                        }
                        else if(mode === 1 || mode === 2){
                            newDevice.hour = -1;
                        }
                        else if(mode === 3){
                            newDevice.hour = -1;
                            newDevice.day = -1;
                        }
                        else if ( mode === 4){
                            newDevice.hour = -1;
                            newDevice.day = -1;
                            newDevice.month = -1;
                        }
                        newDevice.activated = true;
                        newDevice.deleted = false;
                        newDevice.setNext('device_id', function(err, cmt){
                            if(err) throw err;
                            newDevice.save(function (err, resultc) {
                                if(err) throw err;
                                if (resultc) {
                                    return callback(true);
                                }
                                else {
                                    return callback({result:false,message:"create device in mode " + mode +" failed!"});
                                }
                            });
                        });
                    
                    }
                });
                // if(updateResponse){
                //     return callback(true);
                // }   
                // else{
                //     console.log("update device trends cache in mode " + mode +" failed!");
                // }

            });
        });
        
    }
    else{
        callback({result:false,message:"Bad Input"});
    }
};

deviceSchema.plugin(autoIncrement, {inc_field: 'device_id', disable_hooks: true});
deviceSchema.plugin(mongoosePaginate);
let Device = mongoose.model('devices', deviceSchema);
let device = mongoose.model('devices');
module.exports = device;