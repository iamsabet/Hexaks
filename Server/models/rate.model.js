const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var Float = require('mongoose-float').loadType(mongoose);
require('mongoose-long')(mongoose);
var mongoosePaginate = require('mongoose-paginate');

var rateSchema = new Schema({
    rateId : String,
    rater:String, // userId
    value:Number, // 1 to 6
    postId:String,
    changes : Number ,// only 4changes
    activated:Boolean,
    deleted:Boolean,
    createdAt:Number,
    updatedAt:Number
});

rateSchema.methods.Create = function(rateObject,callback){

    let newRate = new Rate(rateObject);
    newRate.createdAt = Date.now();
    newRate.activated = true;
    newRate.rateId = random.generate();
    newRate.deleted = false;
    newRate.save(function(err,result){
        if(result){
            callback(true)
        }
        else{
            callback(false);
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
rateSchema.plugin(mongoosePaginate);
let Rate = mongoose.model('rates', rateSchema);
let rate = mongoose.model('rates');
module.exports = rate;