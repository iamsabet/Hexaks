const express = require('express');
const router = express.Router();

var userSchema = require('../models/user.model');
var user = new userSchema();
/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index.html');
});
router.get('/login', function(req, res, next){
    res.render('login.html');
});
router.get('/register', function(req, res, next){
    res.render('register.html');
});

router.post('/login', function(req, res, next){
    res.render('users.html');
});
router.post('/register', function(req, res, next){
    res.render('users.html');
});

router.post('/remove', function(req, res, next){
    user.Remove(req,res);
});
module.exports = router;
