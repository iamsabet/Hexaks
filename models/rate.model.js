const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var rateSchema = new Schema({ // 9 Pixels
    rateId : String,
    members : [], // userNames
    value:Number, // 1 --> 6
    postId:String,
    createdAt:Date,
    updatedAt:Date,
});

rateSchema.methods.Create = function(req,res,rateObject){
    var newRate = new Rate(rateObject);
    newRate.createdAt = Date.now();
    newRate.rateId = random.generate();
    newRate.save(function(err){
        if(err) throw err;
        console.log(newUser.username);
        res.send({result:true,value:newUser.userId});
    });
};
rateSchema.methods.Edit = function(req,res){


};

rateSchema.methods.Remove = function(req,res){


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

var Rate = mongoose.model('rates', rateSchema);
var rate = mongoose.model('rates');
module.exports = rate;