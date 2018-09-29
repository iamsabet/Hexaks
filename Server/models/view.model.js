const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var CryptoJS = require("crypto-js");
const random = require('randomstring');
const autoIncrement = require('mongoose-sequence')(mongoose);
var mongoosePaginate = require('mongoose-paginate');
var viewSchema = new Schema({
    view_id: Number,
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
    newView.setNext('view_id', function(err, view){
        if(err) throw err;
        newView.save(function(err){
            if(err) return callback(false);
            callback(true);
        });
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
viewSchema.plugin(autoIncrement, {inc_field: 'view_id', disable_hooks: true});
let View = mongoose.model('views', viewSchema);
let view = mongoose.model('views');
module.exports = view;