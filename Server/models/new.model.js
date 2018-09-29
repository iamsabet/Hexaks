const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');

var notificationSchema = new Schema({
    text:String,
    type:String, // keyword  -->  ( comment , rate , follow ( follow requests )(another tab) & follows
    ownerId : String,
    creatorId: String , // userId --> maybe null or hexaks userId ...
    referenceId : String,
    notificationId:String,
    link:String,
    read:Boolean,
    icon:String, // -- if startsWith
    imageUrl : String,
    activated: Boolean,
    deleted: Boolean,
    createdAt : Number,
    updatedAt : Number
});

notificationSchema.methods.Create = function(req,res){

};
notificationSchema.methods.Edit = function(req,res){


};

notificationSchema.methods.Remove = function(req,res){


};

notificationSchema.pre('save', function(next){
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

var Notification = mongoose.model('notifications', notificationSchema);
var notification = mongoose.model('notifications');
module.exports = notification;