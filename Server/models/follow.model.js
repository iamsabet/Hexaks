const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
require('mongoose-long')(mongoose);
let mongoosePaginate = require('mongoose-paginate');
let redis = require("redis");
let users = require("../routes/users");
var CryptoJS = require("crypto-js");
let redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});

var followSchema = new Schema({
    followId : String,
    follower : String, // userId
    following : String , // userId
    activated : Boolean,
    accepted : Boolean,
    deleted:Boolean,
    createdAt : Number,
    updatedAt : Number
});


followSchema.methods.Paginate = function(query,options,req,res){
    follow.paginate(query,options,function(err,follows){
        if(err) {
            console.log(err);
            res.send({docs:[],total:0});
        }
        else {
            if(follows){
                follows.owners = {};
                let selector = "follower";
                if(query.following === {$exists: true}){
                    selector = "following";
                }

                if(follows.docs.length > 0) {
                    for (let x = 0; x < follows.docs.length; x++) {
                        if (!follows.owners[follows.docs[x][selector]]) {
                            users.getUserInfosFromCache(follows.docs[x][selector],function(info) {
                                if (!info.message) {
                                    console.log(info);
                                    follows.owners[follows.docs[x][selector]] = info.username + "/" + info.profilePictureSet;
                                }
                                else {
                                    console.log("err :" + err + " / values : " + info);
                                    follows.owners[follows.docs[x][selector]] = "notfound" + "/" + "male.png";
                                }

                                if (x === follows.docs.length - 1) {
                                    res.send(follows);
                                }
                            });
                        }
                        else {
                            if (x === follows.docs.length - 1) {
                                console.log(follows);
                                res.send(follows);
                            }
                        }
                    }
                }
                else{
                    res.send({docs:[],total:0});
                }
            }
            else{
                res.send(follows);
            }
        }
    });
};


followSchema.methods.create = function(followObject,hostUser,callback){
    let now = Date.now();
    var updateFields = {activated: true , accepted:true , updatedAt:now};
    if(hostUser.privacy){
        updateFields.accepted = false;
    }
    var newFollow = {};
    follow.update({
        follower: followObject.follower,
        following: followObject.following,
        activated:false
    }, updateFields , function (err, result) {
        if (err) res.send({result: false, message: "Oops something went wrong"});
        if (result.n === 0) {
            followObject.createdAt = Date.now();
            followObject.activated = true;
            followObject.deleted = false;
            followObject.accepted = hostUser.privacy;
            followObject.followId = CryptoJS.SHA1(followObject.follower, followObject.following).toString(); //("content","key")
            newFollow = new Follow(followObject);
            newFollow.save(function (err) {
                if (err) res.send({result:false,message:"err in follow object"});
                return callback(true);
            });
        }
        else{
            return callback(true);
        }

    });
};

followSchema.methods.remove = function(unfollowObject,callback){
    follow.findOneAndUpdate({follower:unfollowObject.follower,following:unfollowObject.following,activated:true},{activated:false,accepted:false},function(err,result){
       if(err) return callback({result:false,message:"Oops Something went wrong"});
       if(result) {
            return callback(true);
       }
       else{
            return callback({result:false,message:"Unfollow failed"});
       }
    });
};

followSchema.pre('save', function(next){
    let now = Date.now();
    if(this.updatedAt) {
        this.updatedAt = now;
    }
    else{
        this.createdAt = now;
        this.updatedAt = now;
    }
    next();
});
followSchema.methods.check = function(follower,following,callback){
    // let hashed = CryptoJS.SHA1(blocker, blocked); //("content","key")
    follow.findOne({follower:follower,following:following,activated:true},{accepted:1,followId:1,updatedAt:1},function(resultx){
        if(resultx){
            return callback(resultx);
        }
        else{
            return callback(false);
        }
    })
};
let Follow = mongoose.model('follows', followSchema);
let follow = mongoose.model('follows');
followSchema.plugin(mongoosePaginate);
module.exports = follow;