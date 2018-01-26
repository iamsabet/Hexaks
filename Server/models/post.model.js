const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var bcrypt   = require('bcrypt-nodejs');
var Float = require('mongoose-float').loadType(mongoose);
require('mongoose-long')(mongoose);
var mongoosePaginate = require('mongoose-paginate');

var postSchema = new mongoose.Schema({
    albumId:String, // null if not
    postId : String,
    owner : {
        username: String,
        profilePicUrl:String,
    },
    originalImage:{ // yeki beyne 2000 ta 3000 yeki balaye 4000 --> age balaye 4000 bud yekiam miari azash roo 2000 avali bozorge 2vomi kuchike -- > suggest --> half resolution half price .
        cost:Number, // 0 if free
        resolution:{
            x : Number,
            y : Number,
        }
    },
    ext:String,
    exifData:{},
    largeImage:{
        cost:Number, // 0 if free
        resolution:{
            x : Number,
            y : Number,
        },
    },
    buyers:[], // user id
    hashtags:[],
    categories:[],
    caption:String,
    rate:{
        value:Float,
        counts: Number
    },
    views : Schema.Types.Long ,// viewers.length length
    viewers : [], // String User Ids
    curator : {
        username:String,
        profilePicUrl:String,
    },
    private:Boolean,
    rejected : {
        value: Boolean,
        reason : String,
    },
    advertise:{
        link:String,
    },
    isCurated : Boolean,
    isPrivate : Boolean,
    activated:Boolean,
    createdAt:Date,
    updatedAt:Date
});

postSchema.methods.Create = function(postObject,callback){
    var newPost = new Post(postObject);
    newPost.save(function(err){
        if(err){
            return callback(null);
        }
        return callback(newPost.postId);
    });
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

var Post = mongoose.model('posts', postSchema);
var post = mongoose.model('posts');
postSchema.plugin(mongoosePaginate);
module.exports = post;