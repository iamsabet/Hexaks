const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var bcrypt   = require('bcrypt-nodejs');
var Float = require('mongoose-float').loadType(mongoose);
var notifSchema = new Schema({
    name : String,
    username : String,
    notifId:String,
    owner:String,// username
    text:String,
    link:String,
    read:Boolean,
    icon:String,
    type:String,
    deactive:Boolean

});

notifSchema.methods.Create = function(req,res){

};
notifSchema.methods.Edit = function(req,res){


};

notifSchema.methods.Remove = function(req,res){


};

notifSchema.pre('save', function(next){
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

var Notif = mongoose.model('notifs', notifSchema);
var notif = mongoose.model('notifs');
module.exports = notif;