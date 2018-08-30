const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var bcrypt   = require('bcrypt-nodejs');
var Float = require('mongoose-float').loadType(mongoose);
var badgeSchema = new Schema({
    badgeId:String, // picture name
    badgeName:String,
    text : String,
    rule:String, // conditions --> in cache too -->
    isLeaf : Boolean,
    type:String,
    level:Number,
    activated:Boolean,
    createdAt:Date,
    updatedAt:Date
});
 // basics in mongo --> badge Id to information in redis --> cache
badgeSchema.methods.Create = function(req,res){

};
badgeSchema.methods.Edit = function(req,res){


};

badgeSchema.methods.Remove = function(req,res){


};

badgeSchema.pre('save', function(next){
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


var Badge = mongoose.model('badges', badgeSchema);
var badge = mongoose.model('badges');
module.exports = badge;