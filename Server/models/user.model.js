const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var Float = require('mongoose-float').loadType(mongoose);
var long = require('mongoose-long')(mongoose);
var userSchema = new Schema({
    userId:String,
    username : String,
    email:String,
    fullName:String,
    profilePictureSet:String,
    favouriteProfiles : [], // user ids  //  up to 6   // -->   get most popular profile
    interestCategories:[], // categories  //  up to 6   // -->   field of theyr intrest for suggest and advertise
    password : String,
    gender:String,
    birthDate:Date,
    followingsCount:Number,
    followings:[], 
    blockList:[],// <= 100 
    followersCount:Number,
    location:String,
    city:String,
    country:String,
    phoneNumber:String,
    rate: {
        value: Float,
        points: long,
        counts : long
    },
    views : long,
    postsCount:Number,
    reportsCount:Number,
    verified:{
        emailVerified : Boolean,
        phoneVerified : Boolean,
        email:{
            key : String,
            expire : Number,
        },
        sms: {
            key: String,
            expire: Number,
        }
    },
    bio : String,
    badges:[], // badgeIds -->
    roles : [], // String - Sabet / Admin / Curator / Blogger / Premium / --> founder <-- under 1000 --> future advantages --> + premium ...
    activated:Boolean,
    privacy:Boolean,
    viewedPosts:[], // last 100s
    ban:{
        reason:Boolean,
        expire:Number,
    },
    createdAt:Number,
    updatedAt:Number
});


userSchema.methods.create = function (userObject,callback) {

    let newUser = new User(userObject);
    newUser.createdAt = Date.now();
    newUser.save(function(err){
        if(err) return callback(false);
        callback(true);
    });

};
userSchema.pre('save', function(next){
    if(this.updatedAt) {
        this.updatedAt = Date.now();
    }
    else{
        let now = Date.now();
        this.createdAt = now;
        this.updatedAt = now;
    }
    next();
});

let User = mongoose.model('users', userSchema);
let user = mongoose.model('users');
module.exports = user;