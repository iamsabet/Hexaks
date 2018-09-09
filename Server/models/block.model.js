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

var blockSchema = new Schema({
    blocker : String,
    blocked : String, // userId
    blockId : String , // userId
    activated : Boolean,
    createdAt : Number,
    updatedAt : Number
});


blockSchema.methods.Paginate = function(query,options,req,res){
    block.paginate(query,options,function(err,follows){
        if(err) {
            console.log(err);
            res.send({docs:[],total:0});
        }
        else {
            if(follows){
                follows.owners = {};
                let selector = "follower";
                
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


blockSchema.methods.create = function(blockObject,callback){
    block.update({
        blocker: blockObject.blocker,
        blocked: blockObject.blocked,
        activated:false
    }, {updatedAt:Date.now(),activated:true} , function (err, result) {
        if (err) res.send({result: false, message: "Oops something went wrong"});
        if (result.n === 0) {
            let blockx = {};
            blockObject.createdAt = Date.now();
            blockObject.updatedAt = Date.now();
            blockObject.activated = true;
            blockObject.blockId = CryptoJS.SHA1(blockObject.blocker, blockObject.blocked); //("content","key")
            blockx = new Block(blockObject);
            blockx.save(function (err) {
                if (err) 
                    return callback({result:false,message:"err in block object"});
                else 
                    return callback(true);
            });
        }
        else{
            return callback(true);
        }

    });
};
blockSchema.methods.check = function(blocker,blocked,callback){
    let hashed = CryptoJS.SHA1(blocker, blocked); //("content","key")
    block.findOne({blockId:hashed,activated:true},function(resultx){
        if(resultx){
            return callback(true);
        }
        else{
            return callback(false);
        }
    })
};
blockSchema.methods.remove = function(req,res,unblockObject){
    block.update({blocker:unblockObject.blocker,blocked:unblockObject.blocked,activated:true},{$set:{deactive:false,updatedAt:Date.now()}},function(err,result){
       if(err) res.send({result:false,message:"Oops Something went wrong"});
       if(result && result.n === 1) {
           if(res)
                res.send(true);
            else
                res.send({result:false,message:"Not Blocked"})
       }
       else{
           if(res)
                res.send({result:false,message:"Unblock failed"});
       }
    });
};

blockSchema.pre('save', function(next){
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
let Block = mongoose.model('blocks', blockSchema);
let block = mongoose.model('blocks');
blockSchema.plugin(mongoosePaginate);
module.exports = block;