const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var bcrypt   = require('bcrypt-nodejs');
var Float = require('mongoose-float').loadType(mongoose);
var userSchema = new Schema({
    name : String,
    username : String,
    email:String,
    hashPassword : String,
    followings: [], // object --> {id:"aslkljd","username","akjsd","profPicUrl" : "jasdsnljadsn"}
    followers: [], // object --> {id:"aslkljd","username","akjsd","profPicUrl" : "jasdsnljadsn"}
    rate:Float,
    details:{
        phoneNumber : String,
        bio: String,
    },
    badges:[], // [{"badgid":"kajshdkdass","badsgName":"Feloaskd","badgePictureUrl":"akjsdhkulkj.png"}]


});

userSchema.methods.Create = function(req,res){

    var controllerName = req.body["name"];
    var controllerObject = req.body["controllerObject"];

    user.findOne({name: controllerName},function (err, controller) {
        if (err) throw err;
        if(controller){
            res.send({result:false,message:"controller with name : " + controllerName + "allready exists"});
        }
        console.log(controllerObject);

    });
};
userSchema.methods.Edit = function(req,res){

    var controllerObject = req.body["controllerObject"];
    var controllerId = req.body["id"];
    var controllerName = req.body["name"];
    user.findOneAndUpdate({id: controllerId , name:controllerName},{$set:{controllerObject:controllerObject}},function (err, controller) {
        if (err) throw err;
        if(controller){
            res.send(true);
        }
        else {
            res.send({result: false, message: "did not update controller"});
        }
    });
};

userSchema.methods.Remove = function(req,res){

    user.findOneAndRemove({id :req.body["controllerId"]},function (err,result) {
        if(err) throw err;
        res.send(result);
    });
};

userSchema.pre('save', function(next){
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

var Users = mongoose.model('user', userSchema);
var user = mongoose.model('user');
module.exports = user;