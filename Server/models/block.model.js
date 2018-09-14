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


blockSchema.methods.Paginate = function(query,options,res){
    block.paginate(query,options,function(err,blocks){
        if(err) {
            console.log(err);
            res.send({docs:[],total:0});
        }
        else {
            if(blocks){
                blocks.owners = {};
                if(blocks.docs.length > 0) {
                    for (let x = 0; x < blocks.docs.length; x++) {
                        if (!blocks.owners[blocks.docs[x]["blocked"]]) {
                            users.getUserInfosFromCache(blocks.docs[x]["blocked"],function(info) {
                                if (!info.message) {
                                    blocks.owners[blocks.docs[x]["blocked"]] = info.username + "/" + info.profilePictureSet;
                                }
                                else {
                                    blocks.owners[blocks.docs[x]["blocked"]] = null;
                                }
                                if (x === blocks.docs.length - 1) {
                                    res.send(blocks);
                                }
                            });
                        }
                        else {
                            if (x === blocks.docs.length - 1) {
                                res.send(blocks);
                            }
                        }
                    }
                }
                else{
                    res.send({docs:[],total:0});
                }
            }
            else{
                res.send(blocks);
            }
        }
    });
};


blockSchema.methods.create = function(blocker,blocked,callback){
    let blockObject = {
        blocker:blocker,
        blocked:blocked
    };
    block.update({
        blocker: blockObject.blocker,
        blocked: blockObject.blocked,
        activated:false
    }, {
        $set:{updatedAt:Date.now(),activated:true}
    }, function (err, result) {
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
                    return callback({result:false,message:"Create Block Object Failed"});
                else {
                    return callback(true);
                }
            });
        }
        else{
            return callback(true);
        }

    });
};


blockSchema.methods.check = function(blocker,blocked,callback){
    // let hashed = CryptoJS.SHA1(blocker, blocked); //("content","key")
    block.findOne({blocker:blocker,blocked:blocked,activated:true},function(resultx){
        if(resultx){
            return callback(true);
        }
        else{
            return callback(false);
        }
    })
};


blockSchema.methods.Remove = function(blocker,blocked,callback){
    block.update({blocker:blocker,blocked:blocked,activated:true},{$set:{activated:false,updatedAt:Date.now()}},function(err,result){
       if(err) res.send({result:false,message:"Oops Something went wrong"});
       if(result && result.n === 1) {
           return callback(true);
       }
       else{
            return callback({result:false,message:"Unblock failed"});
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