const mongoose = require('mongoose');
const Schema = mongoose.Schema;
let mongoosePaginate = require('mongoose-paginate');
let redis = require("redis");
let random = require('randomstring');
let users = require("../routes/users");
let redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});
var commentSchema = new Schema({
    commentId : String,
    postId : String,
    postOwnerId : String,
    ownerId : String,
    mentions:[], // usernames @
    hashtags : [], // #
    fullText:String,
    activated:Boolean,
    deleted:Boolean,
    createdAt:Number,
    edited:Boolean,
    updatedAt:Number
});
commentSchema.methods.create = function(commentObject,callback){
    let newComment = new Comment(commentObject);
    newComment.createdAt = Date.now();
    newComment.commentId = commentObject.ownerId+"-cm-"+random.generate(12);
    newComment.updatedAt = Date.now();
    newComment.edited = false;
    newComment.deleted = false;
    newComment.activated = true;
    newComment.save();
    return callback(newComment);
};

commentSchema.pre('save', function(next){
    if(this.updatedAt) {
        this.updatedAt = Date.now();
    }
    else{
        let now = Date.now();
        this.createdAt = now;
        this.updatedAt = now;
    }
    next();
});
commentSchema.methods.Paginate = function(query,options,user,req,res){
    comment.paginate(query,options,function(err,comments){
        if(err) {
            console.log(err);
            res.send({docs:[],total:0});
        }
        else {
            if(comments){
                comments.owners = {};
                if(comments.docs.length > 0) {
                    for (let x = 0; x < comments.docs.length; x++) {
                        if (!comments.owners[comments.docs[x].ownerId]) {
                            users.getUserInfosFromCache(comments.docs[x].ownerId,function(info) {
                                if (!info.message) {
                                    console.log(info);
                                    if(user && info.blockList.indexOf(user.userId) > -1) { // he is blocked by him
                                        delete comments.docs[x];
                                    }
                                    else{
                                        comments.owners[comments.docs[x].ownerId] = info.username + "/" + info.profilePictureSet;
                                        console.log(comments.owners);
                                    }
                                }
                                else {
                                    console.log("err :" + err + " / values : " + info);
                                    comments.owners[comments.docs[x].ownerId] = "not found" + "/" + "male.png";
                                }

                                if (x === comments.docs.length - 1) {
                                    res.send(comments);
                                }
                            });
                        }
                        else {
                            if (x === comments.docs.length - 1) {
                                res.send(comments);
                            }
                        }
                    }
                }
                else{
                    res.send({docs:[],total:0});
                }
            }
            else{
                res.send([]);
            }
        }
    });
};
commentSchema.plugin(mongoosePaginate);
var Comment = mongoose.model('comments', commentSchema);
var comment = mongoose.model('comments');
module.exports = comment;