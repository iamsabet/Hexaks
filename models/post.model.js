const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var bcrypt   = require('bcrypt-nodejs');
var Float = require('mongoose-float').loadType(mongoose);
var postSchema = new Schema({
    postId : String,
    ownerUserName : String,
    ownerUserId : String,
    username : String,
    email:String,
    hashPassword : String,
    followings: [], // object --> {id:"aslkljd","username","akjsd","profPicUrl" : "jasdsnljadsn"}
    followers: [], // object --> {id:"aslkljd","username","akjsd","profPicUrl" : "jasdsnljadsn"}
    rate:Float,
    details:{
        phoneNumber : String,
        bio: String,
    },
    badges:[], // [{"badgid":"kajshdkdass","badsgName":"Feloaskd","badgePictureUrl":"akjsdhkulkj.png"}]
    isCurated : Boolean,
    createdAt:Date,
    updatedAt:Date
});

postSchema.methods.Create = function(req,res){

};
postSchema.methods.Edit = function(req,res){


};

postSchema.methods.Remove = function(req,res){


};

postSchema.pre('save', function(next){
    if(this.updatedAt) {
        this.updatedAt = Date.now();
    }
    else{
        var now = Date.now();
        this.createdAt = now;
        this.updatedAt = now;
    }
    next();
});

var Post = mongoose.model('post', postSchema);
var post = mongoose.model('post');
module.exports = post;