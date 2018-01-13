const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var bcrypt   = require('bcrypt-nodejs');
var Float = require('mongoose-float').loadType(mongoose);
var userSchema = new Schema({
    name : String,
    userId:String,
    username : String,
    email:String,
    profilePictureUrl:String,
    password : String,
    followings: [], // object --> {id:"aslkljd","username","akjsd","profPicUrl" : "jasdsnljadsn"}
    followers: [], // object --> {id:"aslkljd","username","akjsd","profPicUrl" : "jasdsnljadsn"}
    posts:[], // {postId : , smallImageUrl : , ownerUserName : }
    rate:Float,
    verified:{
        email:String,
        sms:String
    },
    uploadingQueue:[],  // post Ids
    uploadingAlbum:String,
    details:{
        phoneNumber : String,
        bio: String
    },
    badges:[], // [{"badgid":"kajshdkdass","badsgName":"Feloaskd","badgePictureUrl":"akjsdhkulkj.png"}]
    roles : [], // String - Sabet / Admin / Curator / Blogger / Premium
    inactivate:Boolean,
    ban:Boolean,
    createdAt:Date,
    updatedAt:Date
});


userSchema.methods.create = function (res,userObject) {

    var newUser = new User(userObject);
    newUser.createdAt = Date.now();
    newUser.userId = random.generate();
    newUser.save(function(err){
        if(err) throw err;
        console.log(newUser.username);
        res.send({result:true,value:newUser.userId});
    });
};
userSchema.pre('save', function(next){
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

var User = mongoose.model('users', userSchema);
var user = mongoose.model('users');
module.exports = user;