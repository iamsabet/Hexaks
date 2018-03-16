const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var activitySchema = new Schema({
    name : String,
    userId : String,
    activityId:String,
    owner:String,// username
    text:String,
    link:String,
    read:Boolean,
    icon:String,
    type:String,
    deactive:Boolean,

});

activitySchema.methods.Create = function(req,res){

};
activitySchema.methods.Edit = function(req,res){


};

activitySchema.methods.Remove = function(req,res){


};

activitySchema.pre('save', function(next){
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

var Activity = mongoose.model('activities', activitySchema);
var activity = mongoose.model('activities');
module.exports = activity;