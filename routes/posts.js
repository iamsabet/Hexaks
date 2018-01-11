const express = require('express');
var postSchema = require('../models/post.model');
var post = new postSchema();
/* GET home page. */
var posts = {

    getAll: function(req, res,data) {
        var allusers = data; // Spoof a DB call
        res.json(allusers);
    },

    getOne: function(req, res,next,data) {
        var id = req.params.id;
        var user = data[0]; // Spoof a DB call
        res.json(user);
    },

    create: function(req, res,next,data) {
        var newuser = req.body;
        data.push(newuser); // Spoof a DB call
        res.json(newuser);
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


module.exports = posts;