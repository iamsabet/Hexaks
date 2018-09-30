const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var redis = require("redis");
var requestIp = require("request-ip");
var random = require('randomstring');
var mongoosePaginate = require('mongoose-paginate');
var autoIncrement = require('mongoose-sequence')(mongoose);






var redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});


var hashtagSchema = new Schema({
    hashtag_id:Number,
    name : String,
    counts : Number,
    hour:Number, //0 - 23 -- > 24 means daily record
    day : Number,
    month : Number,
    year:Number,
    createdAt:Number,
    updatedAt:Number,
    activated:Boolean,
    deleted:Boolean,
});
// hashtagSchema.createIndex({name:1,createdAt:1,counts:1},function(err,resultx){
//     if(err) throw err;
//     console.log(resultx);
// });
//

hashtagSchema.methods.initial = function(mode){ // counts

   redisClient.get("hashtagsInitialized:"+mode,function(err,value) {
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
                    query.month = {$exists:true}; // Hashtag counts for each month ... last 12 months
                    query.year = {$gte:(thisYear-1)};
                }
                
                let timeEdge = now.getTime() - timeLimit;
                // query.name = hashtags[n].name;
                query.updatedAt = {$gt: timeEdge}};

                Hashtag.find(query, {
                    name: 1,
                    counts: 1,
                    }, function (err, hashs) {
                    if (err) throw err;
                    if (hashs.length > 0) {
                        console.log(hashs.length);
                        redisClient.del("hashtagsTrend:"+mode,function(result){
                            redisClient.set("hashtagsInitialized:"+mode, true);
                            for (let z = 0; z < hashs.length; z++) {
                                let countsX = hashs[z].counts;
                              
                                updateHashtagTrendsInCache(mode,hashs[z].name,countsX,function(resultu){
                                    if(resultu){
                                        if ((z === hashs.length - 1) && (n === 0)) {
                                            console.log("hashtags initialized for mode = :" + mode  +" in cache.");
                                            if ((z === hashs.length - 1) && (n === 0)) {
                                                let expireTime = (timeLimit + 30000); // + 30 seconds --> maximum code delay or shit for now
                                                redisClient.set("hashtagsInitialized:"+mode, true);
                                                redisClient.expire("hashtagsTrend:"+mode, expireTime); // expire
                                                redisClient.expire("hashtagsInitialized:"+mode, expireTime);
                                            }
                                        }
                                    }   
                                }); 
                                
                            }
                        });
                    }
                    else {
                        console.log("No hashtags found in initial mode : " + mode);
                    }
                });
                
            }
        });
                // switch expire time with mode
};
hashtagSchema.methods.search = function(searchText,hours,counts,callback){

    if (searchText.length > 0) {
        let timeLimit = (hours * 3600000) || (6 * 3600000); // last 24 hours default --> change to 6hours 24hours 1week and 31days for all trends
        let timeEdge = Date.now() - timeLimit;
        let options = {
            select: 'name',
            sort: {counts: -1},
            page: 1,
            limit: parseInt(counts) || 10 // conclude some tekrari name hashtags in the list up to X hours for each hashtag name
        };
        hashtag.paginate({createdAt: {$gt: timeEdge}}, options, function (err, hashtagsList) {
            if(err) callback(false);
            callback(hashtagsList.docs);
        });
    }
};
hashtagSchema.methods.Create = function(now,mode,hashtagName,callback){
    if((hashtagName) && (typeof hashtagName === "string") && (hashtagName.length > 0)) {
        let hours = now.getHours();
        let day = now.getDay();
        let month = now.getMonth();
        let year = now.getYear() + 1900;
        let nowTime = now.getTime();
        hashtag.updateOne({name:hashtagName.toLowerCase(),hour:-1,day:-1,month:-1,year:-1},{$inc:{counts:1}},function(err,value){ 
            if(err) throw err;
            if(value.n === 0){
                let newHashtag = new Hashtag({name:hashtagName.toLowerCase()});
                newHashtag.createdAt = Date.now();
                newHashtag.updatedAt = Date.now();
                newHashtag.counts = 1;
                newHashtag.name = hashtagName.toLowerCase();
                newHashtag.hour = -1;
                newHashtag.day = -1;
                newHashtag.month = -1;
                newHashtag.year = -1;
                newHashtag.activated = true;
                newHashtag.deleted = false;
                newHashtag.setNext('hashtag_id', function(err, hashtag){
                    if(err) throw err;
                    newHashtag.save(function (err, resultc) {
                        if (resultc) {
                            console.log("master hashtag item created");
                        }
                        else {
                            console.log("master hashtag item create failed!");
                        }
                    });
                });
            }
            let query = {
                name:hashtagName.toLowerCase(),
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
            updateHashtagTrendsInCache(mode,query.name,1,function(updateResponse){
                hashtag.updateOne(query,
                    {$inc: {counts: 1},$set:{updatedAt:nowTime}
                    }, function (err, resultx) {
                    if (err) throw err;

                    if (resultx.n === 0) {

                        let newHashtag = new Hashtag({name: query.name});
                        newHashtag.createdAt = Date.now();
                        newHashtag.updatedAt = Date.now();
                        newHashtag.counts = 1;
                        newHashtag.name = hashtagName;
                        newHashtag.hour = query.hour;
                        newHashtag.day = query.day;
                        newHashtag.month = query.month;
                        newHashtag.year = query.year;
                        newHashtag.activated = true;
                        newHashtag.deleted = false;
                        if(mode === 0){
                
                        }
                        else if(mode === 1 || mode === 2){
                            newHashtag.hour = -1;
                        }
                        else if(mode === 3){
                            newHashtag.hour = -1;
                            newHashtag.day = -1;
                        }
                        else if ( mode === 4){
                            newHashtag.hour = -1;
                            newHashtag.day  -1;
                            newHashtag.month = -1;
                        }
                        newHashtag.activated = true;
                        newHashtag.deleted = false;
                        newHashtag.setNext('hashtag_id', function(err, cmt){
                            if(err) throw err;
                            newHashtag.save(function (err, resultc) {
                                if(err) throw err;
                                if (resultc) {
                                    return callback(true);
                                }
                                else {
                                    return callback({result:false,message:"create hashtag in mode " + mode +" failed!"});
                                }
                            });
                        });
                    
                    }
                });
                // if(updateResponse){
                //     return callback(true);
                // }   
                // else{
                //     console.log("update hashtag trends cache in mode " + mode +" failed!");
                // }

            });
    });
    }
};
function updateHashtagTrendsInCache(type,hashtagName,incValue,callback){
    let increaseValue = incValue || 1;
    if((type) && ((type > -1) && type <= 4)) {
        redisClient.zincrby("hashtagsTrend:"+type, increaseValue, hashtagName, function (err, counts) { // 0 = day , 1 = days , 2 = month
            if (err) throw err; // 
            return callback(true);
        });
    }
}

hashtagSchema.plugin(autoIncrement, {inc_field: 'hashtag_id', disable_hooks: true});
hashtagSchema.plugin(mongoosePaginate);
let Hashtag = mongoose.model('hashtags', hashtagSchema);
let hashtag = mongoose.model('hashtags');
module.exports = hashtag;
