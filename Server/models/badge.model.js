const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var bcrypt   = require('bcrypt-nodejs');
var Float = require('mongoose-float').loadType(mongoose);
var badgeSchema = new Schema({
    badgeId:String,
    usernames:[],
    pictureUrl:String,
    category:String,
    type:String,
    level:Number,
    diactive:Boolean,
    createdAt:Date,
    updatedAt:Date
});

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