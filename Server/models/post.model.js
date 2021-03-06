const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var redis = require('redis');
// resize and remove EXIF profile data
var redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});
var autoIncrement = require('mongoose-sequence')(mongoose);
var Float = require('mongoose-float').loadType(mongoose);
var mongoosePaginate = require('mongoose-paginate');
var rateSchema = require('../models/rate.model');
var postSchema = new Schema({
    post_id:Number,
    album:String,
    postId: String,
    ownerId: String,
    originalImage: { // yeki beyne 2000 ta 3000 yeki balaye 4000 --> age balaye 4000 bud yekiam miari azash roo 2000 avali bozorge 2vomi kuchike -- > suggest --> half resolution half price .
        cost: Number, // 0 if free -1 disable
        resolution: {
            y: Number,
            x: Number
        }
    },
    largeImage: { // yeki beyne 2000 ta 3000 yeki balaye 4000 --> age balaye 4000 bud yekiam miari azash roo 2000 avali bozorge 2vomi kuchike -- > suggest --> half resolution half price .
        cost: Number, // 0 if free -1 if disabled < 1000000 , Toman :D
        resolution: {
            y: Number,
            x: Number
        }
    },
    fileName: String, // string
    ext: String,
    device: {
        brand : String,
        model : String
    }, // strings device id
    location: {},
    gps:{},
    exifData: {
        ExposureTime: Float,
        FNumber: Number,
        ISO: Number,
        DateTimeOriginal: String,
        CreateDate: String,
        ShutterSpeedValue: Float,
        ApertureValue: Number,
        ExposureCompensation: Float,
        MaxApertureValue: Number,
        MeteringMode: Number,
        LightSource: Number,
        Flash: Number,
        FocalLength: Number,
        CustomRendered: Number,
        ExposureMode: Number,
        WhiteBalance: Number
    }, // exif object ( for .jpg & .jpeg only :/ maybe )
    reportsCount : Number,
    hashtags:[],
    mentions:[],
    tags : [], // {userId :"" , position:{x:num,y:num}} // from relative in view
    ContentTokens : [], // from AI
    ContentFullText : String,
    topColors : [], // {colorRange :  number // ( 0-10,11-20,.... 245-255) , abundancePercentage : Float }
    categories:[], // 3 max
    caption:String,
    rate:{
        value : Float, // ((rate.counts / views) * rate.number)*100 = rate.value
        number : Float,
        points : Number,
        counts : Number
    },
    views : Number ,     // viewers.length length
    curatorId:String,
    isPrivate:Boolean,
    rejected:{
        value : Boolean,
        reason : String,
        updatedAt : Number 
    },
    advertise:{
        link:String,
    },
    activated:Boolean,
    createdAt:Number,
    deleted:Boolean,
    updatedAt:Number
});

postSchema.methods.create = function(postObject,user,callback){

    let newPost = new Post(postObject);
    let now = Date.now();
    newPost.createdAt = now;
    newPost.updatedAt = now;
    newPost.deleted = false;
    newPost.setNext('post_id', function(err, pst){
        if(err) throw err;
        newPost.save();
        return callback(true);
    });

};
postSchema.methods.Paginate = function(query,options,user,callback){
    post.paginate(query,options,function(err,posts){
        if(err) {
            throw err;
        }
        else {
            return callback(posts);
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
postSchema.plugin(autoIncrement, {inc_field: 'post_id', disable_hooks: true});
let Post = mongoose.model('posts', postSchema);
let post = mongoose.model('posts');
module.exports = post;
