const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var rowSchema = new Schema({ // 9 Pixels
    postId : String,
    rowId : String,
    rowNumber:Number,
    values:[], // more than 20 - 30 rgb sudden changes --> left to right
    // [{left: {
    //    r:Number,
    //    g:Number,
    //    b:Number,
    //    a:Number,
    // }],
    updatedAt:Date,
    createdAt:Date
});

rowSchema.methods.Create = function(req,res){

};
rowSchema.methods.Edit = function(req,res){


};

rowSchema.methods.Remove = function(req,res){


};

rowSchema.pre('save', function(next){
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

var Row = mongoose.model('rows', rowSchema);
var row = mongoose.model('rows');
module.exports = row;