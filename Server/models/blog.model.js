const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var bcrypt   = require('bcrypt-nodejs');
var Float = require('mongoose-float').loadType(mongoose);
var blogSchema = new Schema({
    blogId:String,
    fullHTMLData:String,
    fullTextOnly : String,
    headerPictureUrl:String,
    hashtags:[],
    categories:[],
    pictureUrl:String,
    category:String,
    deactive:Boolean,
    createdAt:Date,
    updatedAt:Date
});

blogSchema.methods.Create = function(req,res){

};
blogSchema.methods.Edit = function(req,res){


};

blogSchema.methods.Remove = function(req,res){


};

blogSchema.pre('save', function(next){
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

var Blog = mongoose.model('blogs', blogSchema);
var blog = mongoose.model('blogs');
module.exports = blog;