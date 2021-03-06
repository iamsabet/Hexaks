const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const autoIncrement = require('mongoose-sequence')(mongoose);
var Float = require('mongoose-float').loadType(mongoose);
var mongoosePaginate = require('mongoose-paginate');

var userSchema = new Schema({
    user_id :Number,
    userId:String,
    username : String,
    email:String,
    fullName:String,
    profilePictureSet:String,
    favouriteProfiles : [], // user ids  //  up to 6   // -->   get most popular profile
    interestCategories:[], // categories  //  up to 6   // -->   field of theyr intrest for suggest and advertise
    password : String,
    gender:String,
    birthDate:Number,
    birth:{
        day:Number,
        month:Number,
        year:Number,
    },
    followingsCount:Number,
    followersCount:Number,
    followings:[], 
    blockList:[],// <= 100 
    followingCategories : [], //
    followingHashtags : [], //
    followingLocations : [], //
    followingDevices : [], //
    location:{},
    city:String,
    country:String,
    phone:{
        code: Number,
        countryCode :String,
        number : Number 
    },
    rate: {
        value : Float, // ((rate.counts / views) * rate.number)*100 = rate.value
        number : Float,//
        points : Number,
        counts : Number
    },
    views : Number,
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
            createdAt: Number,
        }
    },
    bio : String,
    badges:[], // badgeIds -->
    roles : [], // String - Sabet / Admin / Curator / Blogger / Premium / --> founder <-- under 1000 --> future advantages --> + premium ...
    activated:Boolean,
    deleted:Boolean,
    privacy:Boolean,
    ban:{
        reason:Boolean,
        expire:Number,
    },
    createdAt:Number,
    updatedAt:Number
});


userSchema.methods.create = function (userObject,callback) {
    let now = Date.now();
    let newUser = new User(userObject);
    newUser.createdAt = now;
    newUser.updatedAt = now;
    newUser.ban = null;
    newUser.phone = null;
    newUser.deleted = false;
    newUser.setNext('user_id', function(err, user){
        if(err) throw err;

        newUser.save(function(err){
            if(err) return callback(false);
            callback(true);
        });
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
userSchema.methods.Paginate = function(query,options,user,callback){
    user.paginate(query,options,function(err,usersList){
        if(err) {
            throw err;
        }
        else {
            return callback(usersList);
        }
    });
};
userSchema.plugin(mongoosePaginate);
userSchema.plugin(autoIncrement, {inc_field: 'user_id' , disable_hooks: true});
let User = mongoose.model('users', userSchema);
let user = mongoose.model('users');
module.exports = user;