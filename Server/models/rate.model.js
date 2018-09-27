const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var Float = require('mongoose-float').loadType(mongoose);
var CryptoJS = require("crypto-js");

var mongoosePaginate = require('mongoose-paginate');

var rateSchema = new Schema({
    rateId : String,
    rater:String, // userId
    value:Number, // 1 to 6
    referenceId:String,
    referenceType:String, // post , blog , new ... message ... feedback anyshit 
    changes : Number ,// only 4changes
    activated:Boolean,
    deleted:Boolean,
    createdAt:Number,
    updatedAt:Number
});

rateSchema.methods.create = function(rateObject,callback){

    let newRate = new Rate(rateObject);
    newRate.createdAt = Date.now();
    newRate.rater = rateObject.rater;
    newRate.referenceId = rateObject.referenceId;
    newRate.value = rateObject.value;
    newRate.value = rateObject.referenceType || "post";
    newRate.changes = 0;
    newRate.updatedAt = Date.now();
    newRate.activated = true;
    let hashed = CryptoJS.SHA1(rateObject.rater, rateObject.referenceId); //("content","key")
    newRate.rateId = hashed;
    newRate.deleted = false;
    newRate.save();
    return callback(hashed);
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