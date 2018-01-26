const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var bcrypt   = require('bcrypt-nodejs');
var Float = require('mongoose-float').loadType(mongoose);
var articleSchema = new Schema({
    articleId:String,
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

articleSchema.methods.Create = function(req,res){

};
articleSchema.methods.Edit = function(req,res){


};

articleSchema.methods.Remove = function(req,res){


};

articleSchema.pre('save', function(next){
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

var Article = mongoose.model('articles', articleSchema);
var article = mongoose.model('articles');
module.exports = article;