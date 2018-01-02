const express = require('express');
const router = express.Router();
var passport = require('../config/passport');
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

router.post('/login', passport.authenticate('local-login', {
    successRedirect : '/profile', // redirect to the secure profile section
    failureRedirect : '/login', // redirect back to the signup page if there is an error
    failureFlash : true // allow flash messages
}));
router.post('/register', function(req, res, next){
    res.render('users.html');
});

router.post('/remove', function(req, res, next){
    user.Remove(req,res);
});
module.exports = router;
