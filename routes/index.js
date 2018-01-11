var express = require('express');
var router = express.Router();
var userSchema = require('../models/user.model');
var users = new userSchema();
var auth = require('./auth');
var posts = require('./posts');
var user = require('./users');

var validateRequest = require('../middleWares/validateRequest');
/*
 * Routes that can be accessed by any one
 */
router.get('/', function(req,res){
    res.render("main.html");
});
router.get('/login', function(req,res){
    res.render("login.html");
});
router.get('/register', function(req,res){
    res.render("register.html");
});

router.get('/api/v1/products',function(req,res){
    validateRequest(req,res,function(callback){
        posts.getAll(req,res,callback);
    })
});
router.get('/api/v1/product/:id', posts.getOne);
router.post('/api/v1/product/', posts.create);
router.delete('/api/v1/product/:id', posts.delete);

/*
 * Routes that can be accessed only by authenticated & authorized users
 */
router.get('/api/v1/admin/users/', function(req,res){
    validateRequest(req,res,function(callback) {
        user.getAll(req, res, callback);
    });
});
router.get('/api/v1/admin/user/:id', validateRequest,user.getOne);
router.post('/api/v1/admin/user/', user.create);
router.delete('/api/v1/admin/user/:id', user.delete);


router.post('/login', auth.login);
router.post('/register', function(req,res){
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
                    users.create(res,userObject);
                }
           });
       }
    });
});
/*
 * Routes that can be accessed only by autheticated users
 */


module.exports = router;