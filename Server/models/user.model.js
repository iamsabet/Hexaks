const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var Float = require('mongoose-float').loadType(mongoose);
var userSchema = new Schema({
    userId:String,
    username : String,
    email:String,
    fullName:String,
    profilePictureSet:String,
    profilePictureUrls:[],
    favouriteProfiles : [], // user ids  //  up to 6   // -->   get most popular profile
    interestCategories:[], // categories  //  up to 6   // -->   field of theyr intrest for suggest and advertise
    password : String,
    gender:String,
    birthDay : {
        value:Number,
        date : Date,
    },
    followingsCount:Number,
    followersCount:Number,
    location:String,
    phoneNumber:String,
    city:String,
    country:String,
    rate:{
        number:Float,
        counts:Number,
    },
    verified:{
        emailVerified : Boolean,
        phoneVerified : Boolean,
        email:String,
        sms:String
    },
    boughtImages:[],// {post Id}
    details:{
        phoneNumber : String,
        bio: String
    },
    badges:[], // badgeIds --> up to 3 badges
    roles : [], // String - Sabet / Admin / Curator / Blogger / Premium / --> founder <-- under 1000 --> future advantages --> + premium ...
    inactivate:Boolean,
    deactive:Boolean,
    privacy:Boolean,
    viewedPosts:[], // last 100s
    ban:{
        is:Boolean,
        expire:Number,
    },
    createdAt:Number,
    updatedAt:Number
});


userSchema.methods.create = function (req,res,userObject) {

    let newUser = new User(userObject);
    newUser.createdAt = Date.now();
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
        let now = Date.now();
        this.createdAt = now;
        this.updatedAt = now;
    }
    next();
});

let User = mongoose.model('users', userSchema);
let user = mongoose.model('users');
module.exports = user;