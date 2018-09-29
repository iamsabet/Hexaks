const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var redis = require("redis");
var redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});
var mongoosePaginate = require('mongoose-paginate');

var activitySchema = new Schema({
    text:String,
    type:String, // keyword  -->  ( comment , rate , system , curate
    ownerId : String,
    subjectId : String , // userId --> maybe null or hexaks userId ...
    referenceId : String,
    activityId:String,
    link:String, // 
    icon:String, //
    imageUrl : String,
    activated: Boolean,
    deleted: Boolean,
    createdAt : Number,
    updatedAt : Number
});
// index
activitySchema.methods.Create = function(type,text,ownerId,subjectId,referenceId,link,icon,imageUrl,callback){

    if(text && (typeof text === "string") && (text.length > 2) && type && (typeof text === "string") && (type.length > 2) && ownerId && (typeof ownerId === "string") && (ownerId.length > 2)
        && referenceId && (typeof referenceId === "string") && (referenceId.length > 2) && link && (typeof link === "string") && (link.length > 2)
        && icon && (typeof icon === "string") && (icon.length > 2) ) {
        let newActivity = new Activity({type: type});
        newActivity.createdAt = Date.now();
        newActivity.updatedAt = Date.now();
        newActivity.text = text;
        newActivity.ownerId = ownerId;
        newActivity.type = type;
        newActivity.subjectId = subjectId || ""; // if
        newActivity.referenceId = referenceId;
        newActivity.read = false;
        newActivity.activityId = ownerId+"-act-"+random.generate(16)+"";
        newActivity.link = link;
        newActivity.imageUrl = imageUrl;
        newActivity.activated = true;
        newActivity.deleted = false;
        newActivity.save(function (err, result) {
            if (result) {
                console.log(" Created activity");
                callback(true);
            }
            else{
                callback({result:false,message:"Create notification failed"});
            }
        });
    }
};

activitySchema.methods.Paginate = function(req,res,user,searchUser,counts,pageNumber){

    let hours = 732; // 1 month and half day :D
    let timeLimit = (hours * 3600000);
    let timeEdge = Date.now() - timeLimit;
    if(counts < 40) {
        redisClient.hgetall(user.userId + ":info", function (err, selfInfo) {
            if (err) throw err;
            if (selfInfo) {
                let blockList = [];
                if (selfInfo.blockList === "") {
                    blockList = JSON.parse(selfInfo.blockList);
                }
                let query = {
                    ownerId: {$in: user.followings},
                    subjectId: {$nin: blockList},
                    createdAt: {$gt: timeEdge},
                    deleted: false,
                    activated: true
                };
                if (searchUser !== "") {
                    query.ownerId = new RegExp('^' + searchUser, 'i');
                }
                let options = {
                    select: 'subjectId link imageUrl type text referenceId activityId createdAt updatedAt',
                    sort: {updatedAt: -1},
                    page: pageNumber,
                    limit: parseInt(counts) || 20
                };
                activity.paginate(query, options, function (err, activities) {
                    if (err) throw err;
                    console.log(err);
                    console.log(activities);
                    if (activities.docs.length > 0) {
                        let peopleIds = [];
                        activities.people = {};
                        for (let z = 0; z < activities.docs.length; z++) {
                            for (let m = 0; m < 2; m++) {
                                let hostId = "";
                                if (m === 0) {
                                    if (activities.docs[z].subjectId !== "")
                                        hostId = activities.docs[z].subjectId;
                                    else
                                        break;
                                }
                                else {
                                    hostId = activities.docs[z].ownerId;
                                }
                                if (!activities.owners[activities.docs[z].creatorId]) {
                                    redisClient.hgetall(hostId + ":info", function (err, info) {
                                        if (!err && info) {
                                            if ((user && info.blockList.indexOf(user.userId) > -1) || (user && user.blockList.indexOf(hostId) > -1)) { // he is blocked by him
                                                delete activities.docs[z];
                                                m = 2;
                                                break;
                                            }
                                            else if (JSON.parse(info.privacy) && (user.followings.indexOf(hostId) === -1)) {
                                                delete activities.docs[z];
                                                m = 2;
                                                break;
                                            }
                                            else {
                                                if (user && peopleIds.indexOf(hostId) === -1) {
                                                    peopleIds.push(hostId);
                                                    activities.people[hostId] = info;
                                                }
                                            }
                                        }
                                        else {
                                            res.send({result: false, message: "not found host user in cache"});
                                        }
                                        if (z === activities.docs.length - 1) {
                                            res.send(activities);
                                        }
                                    });
                                }
                            }
                        }
                    }
                    else {
                        res.send([]);
                    }
                });
            }
            else {
                res.send({result: false, message: "not found self user in cache"});
            }
        })
    }
    else{
        res.send({result:false,message:"504 Bad request"});
    }
};

activitySchema.methods.Remove = function(user,activityId,req,res){
    if(user){
        activity.update({
            ownerId: user.userId,
            activityId: activityId,
            deleted:false,
            activated:true
        },
        {
            deleted:true
        },function(err,result) {
            if(result.n > 0){
                if(res) {
                    res.send(true);
                }
            }
            else{
                if(res) {
                    res.send({result: false, message: "Delete activity failed"});
                }
            }
        });
    }
};

activitySchema.methods.Activation = function(user,activityId,flag,req,res){ // admin
    if(user){
        activity.update({
                activityId: activityId,
            },
            {
                activated:flag
            },function(err,result) {
                if(result.n > 0){
                    if(res) {
                        res.send(true);
                    }
                }
                else{
                    if(res) {
                        res.send({
                            result: false,
                            message: "Activity Activation failed from " + !flag.toString() + " to :" + flag.toString()
                        });
                    }
                }
            });
    }
};

activitySchema.pre('save', function(next){
    if(this.updatedAt) {
        this.updatedAt = Date.now();
    }
    else{
        let now = Date.now();
        this.createdAt = now;
        this.updatedAt = now;
    }
    next();
});
activitySchema.plugin(mongoosePaginate);
let Activity = mongoose.model('activities', activitySchema);
let activity = mongoose.model('activities');
module.exports = activity;