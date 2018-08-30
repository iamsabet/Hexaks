const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');

var mongoosePaginate = require('mongoose-paginate');
var viewSchema = new Schema({
    viewId : String,
    viewer : String, // userId
    postId : String,
    deleted : Boolean,
    createdAt : Number,
    updatedAt : Number
});

viewSchema.methods.Create = function(viewObject,callback){
    console.log(viewObject);
    let newView = new View(viewObject);
    newView.createdAt = Date.now();
    newView.viewer = viewObject.viewer;
    newView.postId = viewObject.postId;
    newView.viewId = random.generate(18);
    newView.deleted = false;

    newView.save(function(err,result) {
        if (result) {
            callback(true);
        }
        else {
            callback(false);
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