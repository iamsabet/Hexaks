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
        userSchema.findOne({username:req.body["username"].toLowerCase()},function(err,user){
            if(err)
                res.send({result:false,message:"Oops Something went wrong - please try again"});
            if(user){
                res.send({result:false,message:"user with username -> "+req.body["username"].toLowerCase()+" already exists"});
            }
            else{
                userSchema.findOne({email:req.body["email"].toLowerCase()},function(err,user) {
                    if(err)
                        res.send({result:false,message:"Oops Something went wrong - please try again"});
                    if(user){
                        res.send({result:false,message:"user with email -> "+req.body["email"].toLowerCase()+" already exists"});
                    }
                    else {
                        var roles = [];
                        if(req.body["username"].toLowerCase()==="sabet"){
                            roles.push("sabet");
                        }
                        else if(req.body["username"]==="alireza"){
                            roles.push("admin");
                        }
                        var userObject = {
                            username:req.body["username"].toLowerCase(),
                            password: req.body["password"],
                            email:req.body["email"].toLowerCase(),
                            fullName : req.body["fullName"],
                            roles : roles,
                            city:"",
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
                            followersCount:0,
                            followingsCount:0,
                            uploadingAlbum:[],// max size == 10 --> post id --> initial ["initial"]
                            details:{
                                phoneNumber : "",
                                bio: ""
                            },
                            badges:[], // [{"badgid":"kajshdkdass","badsgName":"Feloaskd","badgePictureUrl":"akjsdhkulkj.png"}]
                            inactivate:false,
                            ban:{
                                is:false,
                                expire:0,
                            },

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

    getHostProfile:function(req,res,user){ // no privacy considered !.
        var hostUsername = req.body.host;
        userSchema.findOne({username:hostUsername},{username:1,fullName:1,followersCount:1,followingsCount:1,city:1,roles:1},function(err,userx){
            if(err) res.send(err);
            if(userx) {
                var response = {user:userx , following:false,followed:false};
                if(user.username === hostUsername){
                    res.send({user:userx,following:null,followed:null});
                }
                if (user.followers.indexOf(hostUsername) > -1) {
                    response.followed = true;
                }
                if(user.followings.indexOf(hostUsername) > -1){
                    response.following = true;
                }
                res.send(response);
            }
            else
                res.send({result:false,message:"User with username "+ hostUsername + " Not Found"});
        });
    },
    getProfileInfo:function(req,res,user){ // no privacy considered !.
        res.send({username:user.username,fullName:user.fullName,email:user.email,bio:user.bio,city:user.city});
    },
    updateProfileInfo:function(req,res,user){

        if(!user.ban.is){

            if(user.username === req.body["username"]){
                user.fullName = req.body["fullName"];
                user.email = req.body["email"];
                user.city = req.body["city"];
                user.bio = req.body["bio"];
                user.save();
                res.send(true);
            }
            else{
                userSchema.findOne({username:req.body["username"].toLowerCase()},function(err,user) {
                    if (err) res.send(err);
                    if (user) {
                        res.send({result:false,message:"username already token"});
                    }
                    else{
                        user.fullName = req.body["fullName"];
                        user.email = req.body["email"];
                        user.city = req.body["city"];
                        user.bio = req.body["bio"];
                        user.username = req.body["username"].toLowerCase();
                        user.save();
                        res.send(true);
                    }
                });
            }

        }
        else{
            res.send({result:false,false:"sorry you cant change your info till your ban expires : "+(user.ban.expire - Date.now().getTime()) });
        }
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