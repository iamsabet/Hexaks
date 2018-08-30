const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var postSchema = require('../models/post.model');
var viewSchema = new Schema({
    viewId : String,
    viewer:String, // userId
    postId:String,
    deleted:Boolean,
    createdAt:Number,
    updatedAt:Number
});

viewSchema.methods.Create = function(req,res,user,postId){

    view.findOne({viewer:user.userId,postId:postId,deleted:1},{viewer:1,deleted:1},function(err,view) {
        if (err) throw err;
        let viewObject = {};
        if (!view) {
            viewObject.postId = postId;
            viewObject.viewer = user.userId;
            let newView = new View(viewObject);
            newView.createdAt = Date.now();
            newView.viewId = random.generate(18);
            newView.deleted = false;
            newView.save(function (err) {
                if (err) throw err;
                console.log(newView.viewer);
                postSchema.findOneAndUpdate({postId:postId},{
                    $inc:{
                        views: +1
                    }
                },function(err,result){
                    if(err) throw err;
                    if(result.n > 0){
                        res.send(true);
                    }
                    else{
                        res.send({result:false,message:"post rate values failed to update"});
                    }
                });
            });
        }
        else{
            res.send({result:false,message:"already viewed this post"});
        }
    });
};


viewSchema.pre('save', function(next){
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

var View = mongoose.model('views', viewSchema);
var view = mongoose.model('views');
module.exports = rate;