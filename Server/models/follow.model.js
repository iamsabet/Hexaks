const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
require('mongoose-long')(mongoose);
let mongoosePaginate = require('mongoose-paginate');
let redis = require("redis");

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
    deactive : Boolean,
    accepted : Boolean,
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
                            redisClient.hgetall(follows.docs[x][selector] + ":info", function (err, info) {
                                if (!err && info) {
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


followSchema.methods.create = function(req,res,followObject,info){

    var updateFields = {deactive: false , accepted:true};
    if(info.privacy){
        updateFields.accepted = false;
    }
    var newFollow = {};
    follow.findOneAndUpdate({
        follower: followObject.follower,
        following: followObject.following,
    }, updateFields , function (err, result) {
        if (err) res.send({result: false, message: "Oops something went wrong"});
        if (result && result.n === 0) {
            followObject.createdAt = Date.now();
            followObject.deactive = false;
            followObject.accepted = !JSON.parse(info.privacy);
            followObject.followId = random.generate(14);
            newFollow = new Follow(followObject);
            newFollow.save(function (err) {
                if (err) res.send({result:false,message:"err in follow object"});
                res.send(true);
            });
        }
        else if(!result){
            console.log(!JSON.parse(info.privacy));
            followObject.createdAt = Date.now();
            followObject.deactive = false;
            followObject.accepted = !JSON.parse(info.privacy);
            followObject.followId = random.generate(14);
            newFollow = new Follow(followObject);
            newFollow.save(function (err) {
                if (err) res.send({result:false,message:"err in follow object"});
                res.send(true);
            });
        }
        else {
             // follow object exists Then )=> updated
        }

    });
};

followSchema.methods.Remove = function(req,unfollowOject,res){
    follow.findOneAndUpdate({follower:unfollowOject.follower,following:unfollowOject.following,deactive:false},{deactive:true,accepted:false},function(err,result){
       if(err) res.send({result:false,message:"Oops Something went wrong"});
       if(result && result.n === 1) {
           if(res)
                res.send(true);
       }
       else{
           if(res)
                res.send({result:false,message:"Unfollow failed"});
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
let Follow = mongoose.model('follows', followSchema);
let follow = mongoose.model('follows');
followSchema.plugin(mongoosePaginate);
module.exports = follow;