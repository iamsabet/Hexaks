const express = require('express');
const router = express.Router();
var userSchema = require('../models/user.model');
var user = new userSchema();
var auth = require('./auth');
/* GET home page. */
var users = {

    getAll: function(req,userId, res) {
        auth.validateUser()
    },

    getOne: function(req, res) {

        var id = req.params.id;
        var user = data[0]; // Spoof a DB call
        res.json(user);
    },

    create: function(req, res) {
        var newuser = req.body;
        data.push(newuser); // Spoof a DB call
        res.json(newuser);
    },

    update: function(req, res) {
        var updateuser = req.body;
        var id = req.params.id;
        data[id] = updateuser; // Spoof a DB call
        res.json(updateuser);
    },

    delete: function(req, res) {
        var id = req.params.id;
        data.splice(id, 1); // Spoof a DB call
        res.json(true);
    }
};

var data = [{
    name: 'user 1',
    id: '1'
}, {
    name: 'user 2',
    id: '2'
}, {
    name: 'user 3',
    id: '3'
}];

module.exports = users;