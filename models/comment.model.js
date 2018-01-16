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
    mentions:[], // username
    fullText:String,
    likes:Number,
    post:{
        postId:String,
        owner:String,//username
    },
    diactive:Boolean,
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


var Comment = mongoose.model('comments', commentSchema);
var comment = mongoose.model('comments');
module.exports = comment;