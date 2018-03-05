const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
require('mongoose-long')(mongoose);
let mongoosePaginate = require('mongoose-paginate');
let redis = require("redis");
let requestIp = require("request-ip");

let redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});

let followSchema = new Schema({
    followId : String,
    follower : String, // userIds
    following : String , // userIds
    deactive : Boolean,
    accepted : Boolean,
    createdAt : Number,
    updatedAt : Number,
});

followSchema.methods.Create = function(req,res,followObject){
    redisClient.hget(followObject.following+":info","privacy",function(err,value) {
        if(err) res.send({result:false,message:"Oops Something went wrong"});
        else {
            var updateFields = {deactive: false , accepted:true};
            if(value === true){
                updateFields.accepted = false;
            }

            followSchema.findOneAndUpdate({
                follower: followObject.follower,
                following: followObject.following,
                deactive: true
            }, updateFields , function (err, result) {
                console.log(result);
                if (err) res.send({result: false, message: "Oops something went wrong"});
                if (result && result.nMatched === 0) {
                    let newFollow = new Follow(followObject);
                    newFollow.createdAt = Date.now();
                    newFollow.deactive = false;

                    if (value === true) {
                        newFollow.accepted = false;
                    }
                    else {
                        newFollow.accepted = true;
                    }
                    newFollow.followId = random.generate(14);
                    newFollow.save(function (err) {
                        if (err) throw err;

                    });
                }
                else if(result && result.nMatched === 1 && result.nModified === 0){
                    res.send({result:false,message:"Oops something went wrong"})
                }
                else {
                     // follow object exists Then )=> updated
                }
                res.send(true);

            });
        }
    });
};

followSchema.methods.Remove = function(req,res,unfollowOject){
    followSchema.findOneAndUpdate({follower:unfollowOject.follower,following:unfollowOject.following,deactive:false},{deactive:true,accepted:false},function(err,result){
       if(err) res.send({result:false,message:"Oops Something went wrong"});
       res.send(true);
    });
};

followSchema.pre('save', function(next){
    var now = Date.now();
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