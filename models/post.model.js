const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var bcrypt   = require('bcrypt-nodejs');
var Float = require('mongoose-float').loadType(mongoose);
var postSchema = new Schema({
    albumId:String,
    postId : String,
    owner : {
        username: String,
        profilePicUrl:String,
    },
    products: [{ // yeki beyne 2000 ta 3000 yeki balaye 4000 --> age balaye 4000 bud yekiam miari azash roo 2000 avali bozorge 2vomi kuchike -- > suggest --> half resolution half price .
        cost:Number,
        resolution:{
            x : Number,
            y : Number,
        },
        imageUrl:String, // XLarge and Large Sizes for sale or can be free if [i]cost === o
    }],
    hashtags:[],
    category:String,
    caption:String,
    rate:{
        number:Float,
        counts: Number,
    },
    viewers : [],// usernames // length
    curator : {
        username:String,
        profilePicUrl:String,
    },
    createdAt:Date,
    updatedAt:Date
});

postSchema.methods.Create = function(req,res){
    var newPost = new Post(postObject);
    newPost.save(function(err){
        if(err) throw err;
        console.log(newPost.postId);
        res.send({result:true,value:newPost.postId});
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
module.exports = post;