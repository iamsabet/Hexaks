const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var bcrypt   = require('bcrypt-nodejs');
var Float = require('mongoose-float').loadType(mongoose);
var notifSchema = new Schema({
    name : String,
    username : String,
    email:String,
    hashPassword : String,
    followings: [], // object --> {id:"aslkljd","username","akjsd","profPicUrl" : "jasdsnljadsn"}
    followers: [], // object --> {id:"aslkljd","username","akjsd","profPicUrl" : "jasdsnljadsn"}
    rate:Float,
    details:{
        phoneNumber : String,
        bio: String,
    },
    badges:[], // [{"badgid":"kajshdkdass","badsgName":"Feloaskd","badgePictureUrl":"akjsdhkulkj.png"}]


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

var Notif = mongoose.model('notification', notifSchema);
var notif = mongoose.model('notification');
module.exports = notif;