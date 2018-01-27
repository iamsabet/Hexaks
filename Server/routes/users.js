const express = require('express');
const router = express.Router();
var userSchema = require('../models/user.model');
var User = new userSchema();
var Jimp = require("jimp");

/* GET home page. */
var users = {

    getAll: function(req, res,data) {


        res.send(data);
    },

    getMe: function(req, res,data) {
        res.json(data);
    },

    register: function(req, res) {
        userSchema.findOne({username:req.body["username"]},function(err,user){
            if(err)
                res.send({result:false,message:"Oops Something went wrong - please try again"});
            if(user){
                res.send({result:false,message:"user with username -> "+req.body["username"]+" already exists"});
            }
            else{
                userSchema.findOne({email:req.body["email"]},function(err,user) {
                    if(err)
                        res.send({result:false,message:"Oops Something went wrong - please try again"});
                    if(user){
                        res.send({result:false,message:"user with email -> "+req.body["email"]+" already exists"});
                    }
                    else {
                        var roles = [];
                        if(req.body["username"]==="sabet"){
                            roles.push("sabet");
                        }
                        else if(req.body["username"]==="alireza"){
                            roles.push("admin");
                        }
                        var userObject = {
                            username:req.body["username"],
                            password: req.body["password"],
                            email:req.body["email"],
                            fullName:req.body["fullName"],
                            roles : roles,

                            profilePictureUrl:"",
                            followings: [], // object --> {id:"aslkljd","username","akjsd","profPicUrl" : "jasdsnljadsn"}
                            followers: [], // object --> {id:"aslkljd","username","akjsd","profPicUrl" : "jasdsnljadsn"}
                            posts:[], // {postId : , smallImageUrl : , ownerUserName : }
                            rate:{
                                number:0.0,
                                counts:0,
                            },
                            verified:{
                                email:"",
                                sms:""
                            },
                            boughtImages:[],// {post Id}
                            isUploadingPost:false,
                            uploadingPost:"",  // post id --> initial --> "initial"
                            isUploadingAlbum:false,
                            uploadingAlbum:[],// max size == 10 --> post id --> initial ["initial"]
                            details:{
                                phoneNumber : "",
                                bio: ""
                            },
                            badges:[], // [{"badgid":"kajshdkdass","badsgName":"Feloaskd","badgePictureUrl":"akjsdhkulkj.png"}]
                            inactivate:false,
                            ban:false,

                        };
                        User.create(res,userObject);
                    }
                });
            }
        });
    },

    initialUpload:function(req,res,user){
        user.isUploadingPost = true;
        user.save();
    },
    removeUploading:function(req,res,user){
        user.isUploadingPost = false;
        user.isUploadingAlbum = false;
        user.uploadingPost = "";
        user.uploadingAlbum = "";
        user.save();
    },

    follow:function(req,res,user){
        user.isUploadingPost = true;
        user.save();
    },
    unfollow:function(req,res,user){
        user.isUploadingPost = true;
        user.save();
    },
    getFollowers:function(req,res,user){
        user.isUploadingPost = true;
        user.save();
    },
    getFollowings:function(req,res,user){
        user.isUploadingPost = true;
        user.save();
    },
    block:function(req,res,user){
        user.isUploadingPost = true;
        user.save();
    },
    unblock:function(req,res,user){
        user.isUploadingPost = true;
        user.save();
    },
    getHostProfile:function(req,res,user){
        user.isUploadingPost = true;
        user.save();
    },
    getSettingsDatas:function(req,res,user){
        user.isUploadingPost = true;
        user.save();
    },
    changeSettings:function(req,res,user){
        user.isUploadingPost = true;
        user.save();
    },
    update: function(req, res,next,data) {
        var updateuser = req.body;
        var id = req.params.id;
        data[id] = updateuser; // Spoof a DB call
        res.json(updateuser);
    },

    delete: function(req, res,next,data) {
        var id = req.params.id;
        data.splice(id, 1); // Spoof a DB call
        res.json(true);
    }
};

module.exports = users;