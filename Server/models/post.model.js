const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var redis = require('redis');
var random = require('randomstring');
var redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});
var Float = require('mongoose-float').loadType(mongoose);
require('mongoose-long')(mongoose);
var mongoosePaginate = require('mongoose-paginate');

var postSchema = new mongoose.Schema({
    albumId:String, // null if not
    postId : String,
    ownerId:String,
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
        points : Float, // value * counts
        counts: Number
    },
    views : Schema.Types.Long ,     // viewers.length length
    curatorId:String,
    private:Boolean,
    rejected : {
        value: Boolean,
        reason : String,
    },
    advertise:{
        link:String,
    },
    activated:Boolean,
    createdAt:Number,
    deleted:Boolean,
    updatedAt:Number
});
postSchema.methods.create = function(postObject,username,callback){
    let newPost = new Post(postObject);
    let now = Date.now();
    newPost.createdAt = now;
    newPost.updatedAt = now;
    newPost.deleted = false;
    newPost.save();
    return callback(true);

};
postSchema.methods.Paginate = function(query,options,req,res){
    post.paginate(query,options,function(err,posts){
        if(err) {
            console.log(err);
            res.send({docs:[],total:0});
        }
        else {
            if(posts){
                posts.owners = {};
                if(posts.docs.length > 0) {
                    for (let x = 0; x < posts.docs.length; x++) {
                        if (!posts.owners[posts.docs[x].ownerId]) {
                            redisClient.hgetall(posts.docs[x].ownerId + ":info", function (err, info) {
                                if (!err && info) {
                                    console.log(info);
                                    posts.owners[posts.docs[x].ownerId] = info.username + "/" + info.profilePictureSet;
                                }
                                else {
                                    console.log("err :" + err + " / values : " + info);
                                    posts.owners[posts.docs[x].ownerId] = "notfound" + "/" + "male.png";
                                }

                                if (x === posts.docs.length - 1) {
                                    res.send(posts);
                                }
                            });
                        }
                        else {
                            if (x === posts.docs.length - 1) {
                                console.log(posts);
                                res.send(posts);
                            }
                        }
                    }
                }
                else{
                    res.send({docs:[],total:0});
                }
            }
            else{
                res.send(posts);
            }
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
let Post = mongoose.model('posts', postSchema);
let post = mongoose.model('posts');
module.exports = post;