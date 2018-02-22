const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var mongoosePaginate = require('mongoose-paginate');
var commentSchema = new Schema({
    commentId : String,
    postId : String,
    postOwnerId : String,
    ownerId : String,
    mentions:[], // usernames @
    hashtags : [], // #
    fullText:String,
    diactive:Boolean,
    createdAt:Number,
    updatedAt:Number
});
commentSchema.methods.create = function(commentObject,callback){
    var newComment = new Comment(commentObject);
    newComment.createdAt = Date.now();
    newComment.updatedAt = Date.now();
    newComment.userId = random.generate(12);
    newComment.save();
    return callback(true);
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
commentSchema.methods.Paginate = function(query,options,req,res){
    comment.paginate(query,options,function(err,comments){
        if(err) {
            console.log(err);
            res.send([]);
        }
        else {
            console.log(comments);
            res.send(comments);
        }
    });
};
commentSchema.plugin(mongoosePaginate);
var Comment = mongoose.model('comments', commentSchema);
var comment = mongoose.model('comments');
module.exports = comment;