const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var bcrypt   = require('bcrypt-nodejs');
var Float = require('mongoose-float').loadType(mongoose);
var userSchema = new Schema({
    userId:String,
    username : String,
    email:String,
    fullName:String,
    profilePictureUrl:String,
    password : String,
    followings: [], // object --> {id:"aslkljd","username","akjsd","profPicUrl" : "jasdsnljadsn"}
    followingsCount:Number,
    followers: [], // object --> {id:"aslkljd","username","akjsd","profPicUrl" : "jasdsnljadsn"}
    followersCount:Number,
    posts:[], // {postId : , smallImageUrl : , ownerUserName : }
    location:String,
    city:String,
    rate:{
        number:Float,
        counts:Number,
    },
    verified:{
        email:String,
        sms:String
    },
    boughtImages:[],// {post Id}
    isUploadingPost:Boolean,
    uploadingPost:String,  // post id --> initial --> "initial"
    isUploadingAlbum:Boolean,
    uploadingAlbum:[],// max size == 10 --> post id --> initial ["initial"]
    details:{
        phoneNumber : String,
        bio: String
    },
    badges:[], // [{"badgid":"kajshdkdass","badsgName":"Feloaskd","badgePictureUrl":"akjsdhkulkj.png"}]
    roles : [], // String - Sabet / Admin / Curator / Blogger / Premium
    inactivate:Boolean,
    ban:{
        is:Boolean,
        expire:Number,
    },
    createdAt:Number,
    updatedAt:Number
});


userSchema.methods.create = function (req,res,userObject) {

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