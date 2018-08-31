const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var redis = require("redis");
var requestIp = require("request-ip");
var random = require('randomstring');
var mongoosePaginate = require('mongoose-paginate');
var redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});


var hashtagSchema = new Schema({
    name : String,
    counts : Number,
    hour:Number, //0 - 23 -- > 24 means daily record
    day : Number,
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

hashtagSchema.methods.Paginate = function(hours,counts){
    redisClient.get("hashtagsInitialized:"+hours.toString()+"cache",function(err,value) {
        if (err) throw err;
        console.log(value);
        if (!value) {

            let timeLimit = (hours * 3600000) || (6 * 3600000); // last 24 hours default --> change to 6hours 24hours 1week and 31days for all trends
            let timeEdge = Date.now() - timeLimit;
            let options = {
                select: 'name counts createdAt updatedAt',
                sort: {counts: -1},
                page: 1,
                limit: parseInt(counts) || 1000 // conclude some tekrari name hashtags in the list up to X hours for each hashtag name
            };
            hashtag.paginate({createdAt: {$gt: timeEdge}}, options, function (err, hashtagsList) {
                if (err) throw err;
                console.log(err);
                console.log(hashtagsList);
                if (hashtagsList.docs.length > 0) {
                    if (hours === 6 || hours === 24 || hours === 168 || hours === 720) {
                        for (let m = 0; m < hashtagsList.docs.length; m++) {
                            let hashname = hashtagsList.docs[m].name;
                            let hashCounts = hashtagsList.docs[m].counts;
                            console.log(hashtagsList.docs.length);
                            redisClient.zincrby("hashtagsTrend:" + hours.toString()+"cache", hashCounts, hashname, function (err, resultm) {
                                console.log(resultm + " / count  " + hashCounts + " / name : " + hashname);
                                if (m === hashtagsList.docs.length - 1) {
                                    let expireTime = (((hours / 6)*3600000) - 30000); // -30 seconds --> maximum code delay or shit for now
                                    redisClient.set("hashtagsInitialized:"+hours.toString()+"cache",true);
                                    redisClient.expire("hashtagsTrend:" + hours.toString()+"cache", expireTime); // expire
                                    redisClient.expire("hashtagsInitialized:"+hours.toString()+"cache",expireTime);
                                }
                            });
                        }
                    }
                    else {
                        console.log("Bad input for hashtags expire cached");
                    }
                }
                else {
                    console.log("no hashtag found" + counts + " " + hours);
                }
            });
        }
        else{
            console.log("Already Initialized The Hashtags Cache for "+hours + " hours");
        }
    });
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
hashtagSchema.methods.Create = function(now,hashtagName,callback){

    if(hashtagName && (typeof hashtagName === "string") && (hashtagName.length > 2)) {

        let hours = now.getHours().toString();

        let windowEdge = Date.now() - 3600000 + 60000; // 59 minutes before

        hashtag.update({
            name: hashtagName,
            hour: hours,
            createdAt: {$gt: windowEdge}
        },{$inc: {counts: 1}}, function (err, resultx) {
            if (err) throw err;
            if (resultx.n === 0) {
                let newHashtag = new Hashtag({name:hashtagName});
                newHashtag.createdAt = Date.now();
                newHashtag.updatedAt = Date.now();
                newHashtag.counts = 1;
                newHashtag.name = hashtagName;
                newHashtag.hour = hours;
                newHashtag.activated = true;
                newHashtag.deleted = false;
                console.log(resultx);
                newHashtag.save(function (err, result) {
                    if (result) {
                        redisClient.zincrby("hashtagsTrend:6cache",1, hashtagName, function (err, counts) {
                            if (err) throw err;
                            if(counts.toString() === "1"){
                                redisClient.set("hashtagsInitialized:6cache",false);
                            }
                            redisClient.zincrby("hashtagsTrend:24cache",1, hashtagName, function (err, counts2) {
                                if (err) throw err;
                                if(counts2.toString() === "1"){
                                    redisClient.set("hashtagsInitialized:24cache",false);
                                }
                                redisClient.zincrby("hashtagsTrend:168cache",1, hashtagName, function (err, counts3) {
                                    if (err) throw err;
                                    if(counts3.toString() === "1"){
                                        redisClient.set("hashtagsInitialized:168cache",false);
                                    }
                                    redisClient.zincrby("hashtagsTrend:720cache",1, hashtagName, function (err, counts4) {
                                        if (err) throw err;
                                        console.log(counts4);
                                        if(counts4.toString() === "1"){
                                            redisClient.set("hashtagsInitialized:720cache",false);
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
                redisClient.zincrby("hashtagsTrend:6cache",1,hashtagName, function (err, counts) {
                    if (err) throw err;
                    if(counts.toString() === "1"){
                        redisClient.set("hashtagsInitialized:6cache",false);
                    }
                    redisClient.zincrby("hashtagsTrend:24cache",1, hashtagName, function (err, counts2) {
                        if (err) throw err;
                        if(counts2.toString() === "1"){
                            redisClient.set("hashtagsInitialized:24cache",false);
                        }
                        redisClient.zincrby("hashtagsTrend:168",1, hashtagName, function (err, counts3) {
                            if (err) throw err;
                            if(counts3.toString() === "1"){
                                redisClient.set("hashtagsInitialized:168cache",false);
                            }
                            redisClient.zincrby("hashtagsTrend:720",1, hashtagName, function (err, counts4) {
                                if (err) throw err;
                                console.log(counts4);
                                if(counts4.toString() === "1"){
                                    redisClient.set("hashtagsInitialized:720cache",false);
                                }
                                callback(true);
                            });
                        });
                    });
                });
            }
        });
    }
};


hashtagSchema.plugin(mongoosePaginate);
let Hashtag = mongoose.model('hashtags', hashtagSchema);
let hashtag = mongoose.model('hashtags');
module.exports = hashtag;
