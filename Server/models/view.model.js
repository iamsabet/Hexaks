const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var CryptoJS = require("crypto-js");
const random = require('randomstring');

var mongoosePaginate = require('mongoose-paginate');
var viewSchema = new Schema({
    viewId : String,
    viewer : String, // userId
    postId : String,
    deleted : Boolean,
    activated:Boolean,
    createdAt : Number,
    updatedAt : Number
});

viewSchema.methods.create = function(viewObject,callback){
    let newView = new View(viewObject);
    newView.createdAt = Date.now();
    newView.updatedAt = Date.now();
    newView.viewer = viewObject.viewer;
    newView.postId = viewObject.postId;
    let hashed = CryptoJS.SHA1(viewObject.viewer, viewObject.postId); //("content","key")
    newView.viewId = hashed;
    newView.deleted = false;
    newView.activated = true;
    newView.save(function(err,result) {
        if(err)
            return callback(true);
        if (result) {
            return callback(result);
        }
        else {
            return callback(false);
        }
    });
};


viewSchema.pre('save', function(next){
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

viewSchema.plugin(mongoosePaginate);
let View = mongoose.model('views', viewSchema);
let view = mongoose.model('views');
module.exports = view;