const express = require('express');
const router = express.Router();
var userSchema = require('../models/user.model');
var user = new userSchema();
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
                            roles : roles

                        };
                        user.create(res,userObject);
                    }
                });
            }
        });
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