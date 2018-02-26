const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
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
    generatedHashtags:[],
    categories:[],
    caption:String,
    rate:{
        value:Float,
        counts: Number
    },
    views : Schema.Types.Long ,     // viewers.length length
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
    activated:Boolean,
    createdAt:Number,
    updatedAt:Number
});
postSchema.methods.create = function(postObject,callback){
    var newPost = new Post(postObject);
    newPost.createdAt = Date.now();
    newPost.updatedAt = Date.now();
    newPost.userId = random.generate(12);
    newPost.save();
    return callback(true);
};
postSchema.methods.Paginate = function(query,options,req,res){
    post.paginate(query,options,function(err,posts){
        if(err) {
            console.log(err);
            res.send([]);
        }
        else {
            console.log(posts);
            res.send(posts);
        }
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
postSchema.plugin(mongoosePaginate);
var Post = mongoose.model('posts', postSchema);
var post = mongoose.model('posts');
module.exports = post;