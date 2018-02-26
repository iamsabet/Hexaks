const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var viewSchema = new Schema({ // 9 Pixels
    rateId : String,
    members : [], // userNames
    value:Number, // 1 --> 6
    postId:String,
    createdAt:Number,
    updatedAt:Number
});

viewSchema.methods.Create = function(req,res,rateObject){
    var newView = new View(rateObject);
    newView.createdAt = Date.now();
    newView.rateId = random.generate();
    newView.save(function(err){
        if(err) throw err;
        console.log(newView.username);
        res.send({result:true,value:newView.userId});
    });
};
viewSchema.methods.Edit = function(req,res){


};

viewSchema.methods.Remove = function(req,res){


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

var View = mongoose.model('views', viewSchema);
var view = mongoose.model('views');
module.exports = view;