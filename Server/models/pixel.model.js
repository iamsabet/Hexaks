const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var pixelSchema = new Schema({ // 9 Pixels
    postId : String,
    pixelId : String,
    position:Number,
    value:{
        r : Number ,
        g : Number ,
        b : Number ,
        a : Number
    },
    createdAt:Number
});

pixelSchema.methods.Create = function(req,res){

};
pixelSchema.methods.Edit = function(req,res){


};

pixelSchema.methods.Remove = function(req,res){


};

pixelSchema.pre('save', function(next){
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

var Pixel = mongoose.model('pixels', pixelSchema);
var pixel = mongoose.model('pixels');
module.exports = pixel;