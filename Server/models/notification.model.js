const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var redis = require("redis");
let users = require("../routes/users");
var autoIncrement = require('mongoose-sequence')(mongoose);
var redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});
var mongoosePaginate = require('mongoose-paginate');

var notificationSchema = new Schema({
    notification_id:Number,
    text:String,
    type:String, // keyword  -->  ( comment , rate , system , curate )
    ownerId : String,
    creatorId: String , // userId --> maybe null or hexaks userId ...
    referenceId : String,
    notificationId:String,
    link:String,
    read:Boolean,
    icon:String, //
    imageUrl : String,
    activated: Boolean,
    deleted: Boolean,
    createdAt : Number,
    updatedAt : Number
});
// index
notificationSchema.methods.Create = function(notificationObject,now,callback){
    console.log(" notification before condition ");
    if(notificationObject.text && (typeof notificationObject.text === "string") && (notificationObject.text.length > 2) && notificationObject.type && (typeof notificationObject.text === "string") && (notificationObject.type.length > 2) && notificationObject.ownerId && (typeof notificationObject.ownerId === "string")) {
        let newNotification = new Notification(notificationObject);
        console.log(" notification before condition ");
        newNotification.createdAt = now;
        newNotification.updatedAt = now;
        newNotification.text = notificationObject.text;
        newNotification.ownerId = notificationObject.ownerId;
        newNotification.type = notificationObject.type;
        newNotification.creatorId = notificationObject.creatorId;
        newNotification.referenceId = notificationObject.referenceId;
        newNotification.read = false;
        newNotification.notificationId = random.generate(16);
        newNotification.link = notificationObject.link;
        newNotification.imageUrl = notificationObject.imageUrl;
        newNotification.activated = true;
        newNotification.deleted = false;
        newNotification.save(function (err, result) {
            if (result) {
                let tab = "environment";
                if(newNotification.type === "system"){
                    tab = "system";
                }
                console.log(" notification created ");
                redisClient.hincrby(newNotification.ownerId+":unreadNotifications",tab,1,function (err, counts) {
                    if (err) throw err;
                    callback(counts);
                });
            }
            else{
                callback({result:false,message:"Create notification failed"});
            }
        });
    }
};

notificationSchema.methods.Paginate = function(req,res,user,searchUser,counts,pageNumber,type){

    let hours = 732; // 1month and half day :D
    let timeLimit = (hours * 3600000);
    let timeEdge = Date.now() - timeLimit;
    let query = {
        ownerId: user.userId,
        type: type,
        createdAt: {$gt: timeEdge},
        deleted: false,
        activated: true
    };
    if(searchUser !== ""){
        query.creatorId = new RegExp('^' +searchUser, 'i');
    }
    let options = {
        select: 'creatorId read link imageUrl type text referenceId notificationId createdAt updatedAt',
        sort: {updatedAt: -1},
        page: pageNumber,
        limit: parseInt(counts) || 10
    };
    notification.paginate(query, options, function (err, notifications) {
        if (err) throw err;
        console.log(err);
        console.log(notifications);
        notifications.creators = {};
        if (notifications.docs.length > 0) {
            let creatorIds = [];
            for( let z = 0 ; z < notifications.docs.length ; z++){
                if (!notifications.owners[notifications.docs[z].creatorId]) {
                    users.getUserInfosFromCache(notifications.docs[z].creatorId,function(info) {
                        if (!info.message) {
                            let ownerIds = [];
                            if (user && (ownerIds.indexOf(notifications.docs[z].creatorId) === -1)) {
                                creatorIds.push(notifications.docs[z].creatorId);
                            }
                            notifications.creators[notifications.docs[z].creatorId] = info;
                        }
                        else{
                            console.log("not found user in cache");
                        }
                        if (z === notifications.docs.length - 1) {
                            res.send(notifications);
                        }
                    });
                }
            }
        }
        else {
            console.log([]);
        }
    });

};

notificationSchema.methods.Read = function(req,res,user,type,notificationIds){

    if(notificationIds.length > 0) {
        let tab = "environment";
        if (type === "system") {
            tab = "system"
        }
        redisClient.hincrby(ownerId + ":unreadNotifications", tab, (-1 * notificationIds.length), function (err, counts) {
            if (err) throw err;
            console.log(counts);
            res.send(true);
            notification.update({ownerId:user.userId,notificationId: {$in: notificationIds},read:false,deleted:false,activated:true},{read:true},function(err,result){
                if(err) throw err;
                console.log("notifications read result : " + result);
            })
        });
    }
};

notificationSchema.methods.Remove = function(user,notificationId,req,res){
    if(user){
    notification.update({
        ownerId: user.userId,
        notificationId: notificationId,
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
                    res.send({result: false, message: "Delete notification delete failed"});
                }
            }
        });
    }
};

notificationSchema.methods.Activation = function(user,notificationId,flag,req,res){ // admin
    if(user){
        notification.update({
                notificationId: notificationId,
                activated:!flag
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
                            message: "Notification Activation failed from " + !flag.toString() + " to :" + flag.toString()
                        });
                    }
                }
            });
    }
};

notificationSchema.pre('save', function(next){
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
notificationSchema.plugin(mongoosePaginate);
notificationSchema.plugin(autoIncrement, {id:"notification_id",inc_field: 'notification_id', disable_hooks: true});
let Notification = mongoose.model('notifications', notificationSchema);
let notification = mongoose.model('notifications');
module.exports = notification;