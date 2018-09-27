const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var CryptoJS = require("crypto-js");
const random = require('randomstring');

var mongoosePaginate = require('mongoose-paginate');
var viewSchema = new Schema({
    viewId : String,
    viewer : String, // userId
    refrenceId : String,
    deleted : Boolean,
    activated:Boolean,
    referenceType : String, // users , hashtag , category , location , device 
    createdAt : Number,
    updatedAt : Number
});

viewSchema.methods.create = function(viewObject,callback){
    let newView = new View(viewObject);
    newView.createdAt = Date.now();
    newView.updatedAt = Date.now();
    newView.viewer = viewObject.viewer;
    newView.viewer = viewObject.referenceType || "post";
    newView.refrenceId = viewObject.refrenceId;
    let hashed = CryptoJS.SHA1(viewObject.viewer, viewObject.refrenceId); //("content","key")
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