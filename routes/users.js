const express = require('express');
const router = express.Router();
var userSchema = require('../models/user.model');
var user = new userSchema();
var auth = require('./auth');
/* GET home page. */
var users = {

    getAll: function(req, res,data) {
        console.log(data);
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

module.exports = users;