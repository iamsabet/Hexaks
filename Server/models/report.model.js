const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var users = require("../routes/users");
const autoIncrement = require('mongoose-sequence')(mongoose);
let mongoosePaginate = require('mongoose-paginate');
let redis = require("redis");

let redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});

var reportSchema = new Schema({
    id:Number,
    reportId : String,
    referenceType : String, // "user - post  - "
    referenceId : String , // userId - postId - commentId ...
    value : Number, //
    message : String,
    createdAt : Number,
    updatedAt : Number
});


reportSchema.methods.Paginate = function(query,options,req,res){
    report.paginate(query,options,function(err,follows){
        if(err) {
            console.log(err);
            res.send({docs:[],total:0});
        }
        else {
            if(follows){
                follows.owners = {};
                let selector = "follower";
                if(query.following === {$exists: true}){
                    selector = "following";
                }

                if(follows.docs.length > 0) {
                    for (let x = 0; x < follows.docs.length; x++) {
                        if (!follows.owners[follows.docs[x][selector]]) {
                            users.getUserInfosFromCache(follows.docs[x][selector],function(info) {
                                if (!info.message) {
                                    console.log(info);
                                    follows.owners[follows.docs[x][selector]] = info.username + "/" + info.profilePictureSet;
                                }
                                else {
                                    console.log("err :" + err + " / values : " + info);
                                    follows.owners[follows.docs[x][selector]] = "notfound" + "/" + "male.png";
                                }

                                if (x === follows.docs.length - 1) {
                                    res.send(follows);
                                }
                            });
                        }
                        else {
                            if (x === follows.docs.length - 1) {
                                console.log(follows);
                                res.send(follows);
                            }
                        }
                    }
                }
                else{
                    res.send({docs:[],total:0});
                }
            }
            else{
                res.send(follows);
            }
        }
    });
};


reportSchema.methods.create = function(req,res,followObject,info){

    var updateFields = {deactive: false , accepted:true};
    if(info.privacy){
        updateFields.accepted = false;
    }
    var newFollow = {};
    report.findOneAndUpdate({
        follower: followObject.follower,
        following: followObject.following,
    }, updateFields , function (err, result) {
        if (err) res.send({result: false, message: "Oops something went wrong"});
        if (result && result.n === 0) {
            followObject.createdAt = Date.now();
            followObject.deactive = false;
            followObject.accepted = !JSON.parse(info.privacy);
            followObject.followId = random.generate(14);
            newFollow = new Follow(followObject);
            newFollow.save(function (err) {
                if (err) res.send({result:false,message:"err in follow object"});
                res.send(true);
            });
        }
        else if(!result){
            console.log(!JSON.parse(info.privacy));
            followObject.createdAt = Date.now();
            followObject.deactive = false;
            followObject.accepted = !JSON.parse(info.privacy);
            followObject.followId = random.generate(14);
            newFollow = new Follow(followObject);
            newFollow.save(function (err) {
                if (err) res.send({result:false,message:"err in follow object"});
                res.send(true);
            });
        }
        else {
            // follow object exists Then )=> updated
        }

    });
};

reportSchema.methods.Remove = function(req,res,user,reportId){
    if(user && (user.roles.indexOf("admin") > -1 || user.roles.indexOf("superuser") > -1 || user.roles.indexOf("sabet") > -1)) {
        report.findOneAndUpdate({reportId: reportId, deleted: false}, {deleted: true}, function (err, result) {
            if (err) res.send({result: false, message: "Oops Something went wrong"});
            if (result && result.n === 1) {
                if (res)
                    res.send(true);
            }
            else {
                if (res)
                    res.send({result: false, message: "delete report failed"});
            }
        });
    }
    res.send({result:false,message:"401 Unauthorized"});
};

reportSchema.pre('save', function(next){
    let now = Date.now();
    if(this.updatedAt) {
        this.updatedAt = now;
    }
    else{
        this.createdAt = now;
        this.updatedAt = now;
    }
    next();
});
reportSchema.plugin(autoIncrement, {id:"report_id",inc_field: 'report_id', disable_hooks: true});
reportSchema.plugin(mongoosePaginate);

let Report = mongoose.model('reports', reportSchema);
let report = mongoose.model('reports');
module.exports = report;
