const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var postSchema = require('../models/post.model');

var rateSchema = new Schema({ // 9 Pixels
    id:Number,
    rateId : String,
    rater:String, // userId
    value:Number, // 1 to 6
    postId:String,
    changes : Number ,// only 4changes
    deleted:Boolean,
    createdAt:Number,
    updatedAt:Number
});

rateSchema.methods.Create = function(req,res,user,postId,rateNumber,post){

    rateSchema.findOne({rater:user.userId,postId:req.body.postId},{rateId:1,changes:1,rater:1,postId:1,value:1},function(err,rate) {
        if (err) throw err;
        let rateObject = {};
        if (rate) {
            if(rate.changes < 4) {
                rate.save();
                rateSchema.findOneAndUpdate({rateId:rate.rateId},{
                    $set:{
                        value:rateNumber
                    },
                    $inc:{
                        changes : +1
                    }
                },function(err,result){
                   if(err) res.send({result:false,message:"Update rate object failed"});
                   if(result.n > 0){
                        // update postInfos @rate
                        let diff = (rate.value - rateNumber);
                        let changeValue = (diff/post.rate.counts);
                        let value = post.rate.value + changeValue;
                        let points = post.rate.points + diff;
                        postSchema.findOneAndUpdate({postId:rate.postId},{
                            $set:{
                                rate:{
                                    points:points,
                                    value:value
                                }
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
                   }
                   else{
                       res.send({result:false,message:"Update rate object failed"});
                   }
                });
            }
            else{
                res.send({result:false,message:"Maximum changes for a rate reached! try no more"});
            }
        }
        else {
            rateObject.value = rateNumber;
            rateObject.changes = 0;
            rateObject.postId = postId;
            let newRate = new Rate(rateObject);
            newRate.createdAt = Date.now();
            newRate.rateId = random.generate();
            newRate.deleted = false;
            newRate.save(function (err) {
                if (err) throw err;
                console.log(newRate.userId);
                let counts = post.rate.count + 1 ;
                let points = (post.rate.points + rateNumber);
                let value = points / counts;
                postSchema.findOneAndUpdate({postId:rateObject.postId},{
                    $set:{
                        rate:{
                            points:points,
                            value:value,
                            counts:counts
                        }
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
    });
};


rateSchema.pre('save', function(next){
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

var Rate = mongoose.model('reciepts', rateSchema);
var rate = mongoose.model('reciepts');
module.exports = rate;