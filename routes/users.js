const express = require('express');
const router = express.Router();

var userSchema = require('../models/user.model');
var user = new userSchema();
/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index.html');
});
router.post('/create', function(req, res, next){

    user.Create(req,res);
});
router.post('/edit', function(req, res, next){

    user.Edit(req,res);
});
router.post('/remove', function(req, res, next){
    user.Remove(req,res);
});
module.exports = router;
