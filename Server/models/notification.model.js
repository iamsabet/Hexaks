const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var notificationSchema = new Schema({
    name : String,
    userId : String,
    notificationId:String,
    owner:String,// username
    text:String,
    link:String,
    read:Boolean,
    icon:String,
    type:String,
    deactive:Boolean,

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