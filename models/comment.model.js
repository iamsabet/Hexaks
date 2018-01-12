const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var bcrypt   = require('bcrypt-nodejs');
var Float = require('mongoose-float').loadType(mongoose);
var commentSchema = new Schema({
    albumId : String,
    owner : {
        username: String,
        profilePicUrl:String,
    },

    hashtags:[],
    categories:[],
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

commentSchema.methods.Create = function(req,res){

};
commentSchema.methods.Edit = function(req,res){


};

commentSchema.methods.Remove = function(req,res){


};

commentSchema.pre('save', function(next){
    var now = Date.now();
    this.createdAt = now;
    next();
});

var Comment = mongoose.model('comments', commentSchema);
var comment = mongoose.model('comments');
module.exports = comment;