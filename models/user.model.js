const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var userSchema = new Schema({
    dbName : String,
    name: String ,
    id:String,

});

userSchema.methods.Create = function(req,res){

    var controllerName = req.body["name"];
    var controllerObject = req.body["controllerObject"];

    users.findOne({name: controllerName},function (err, controller) {
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
    users.findOneAndUpdate({id: controllerId , name:controllerName},{$set:{controllerObject:controllerObject}},function (err, controller) {
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

    users.findOneAndRemove({id :req.body["controllerId"]},function (err,result) {
        if(err) throw err;
        res.send(result);
    });
};
userSchema.methods.getControllersList = function(req,res){
    users.find({},{name:1,id:1},function (err,result) {
        if(err) throw err;
        res.send(result);
    });
};
userSchema.methods.getControllersList = function(req,res){
    users.find({},{name:1,id:1},function (err,results) {
        if(results.length > 0) {
            res.send(results);
        }
        else{
            res.send({result: false, message: "no model found - failed"});
        }
    });
};
userSchema.methods.getControllerInfo = function(req,res){ // delete by name

    var controllerName = req.body['controllerName'];
    users.findOne({ name: controllerName},{controllerObject:1} ,function (err, result) {
        if (err) throw err;
        if(result)
            res.send(result);
        else
            res.send({result:false,message:"no model found - failed"});
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

var Users = mongoose.model('users', userSchema);
var users = mongoose.model('users');
module.exports = users;