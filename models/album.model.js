const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var bcrypt   = require('bcrypt-nodejs');
var Float = require('mongoose-float').loadType(mongoose);
var albumSchema = new Schema({
    albumId : String,
    owner : {
        username: String,
        profilePicUrl:String,
    },
    products: [{ // yeki beyne 2000 ta 3000 yeki balaye 4000 --> age balaye 4000 bud yekiam miari azash roo 2000 avali bozorge 2vomi kuchike -- > suggest --> half resolution half price .
        cost:Number,
        resolution:{
            x : Number,
            y : Number,
        },
        imageUrl:[], // Big and Medium Sizes for sale
    }],
    hashtags:[],
    categories:[],
    title : String,
    caption : String,
    rate:{
        number:Float,
        counts: Number,
    },
    albumArtUrl : String, // preview images
    curator : {
        username:String,
        profilePicUrl:String,
    },
    badges:[], // [{"badgid":"kajshdkdass","badsgName":"Feloaskd","badgePictureUrl":"akjsdhkulkj.png"}]
    isCurated : Boolean,
    createdAt:Date,
    updatedAt:Date
});

albumSchema.methods.Create = function(req,res){

};
albumSchema.methods.Edit = function(req,res){


};

albumSchema.methods.Remove = function(req,res){


};

albumSchema.pre('save', function(next){
    var now = Date.now();
    this.createdAt = now;
    next();
});

var Album = mongoose.model('albums', albumSchema);
var album = mongoose.model('albums');
module.exports = post;