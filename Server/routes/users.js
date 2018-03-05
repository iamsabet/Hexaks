var userSchema = require('../models/user.model');
var User = new userSchema();
var followSchema = require('../models/follow.model');
var Follow = new followSchema();
var redis = require('redis');
var random = require('randomstring');
var redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});


/* GET home page. */
var users = {

    getMe: function(req, res,data) {
        res.send(data);
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
                            userId : random.generate(12),
                            email:req.body["email"].toLowerCase(),
                            fullName : req.body["fullName"],
                            roles : roles,
                            city:"",
                            gender : req.body.gender || "male",
                            birthDay : {
                                value:Number,
                                date : Date,
                            },
                            profilePictureSet:(req.body.gender || "male") + ".png",
                            profilePictureUrls:[],
                            favouriteProfiles : [], // user ids  //  up to 6   // -->   get most popular profile
                            intrestCategories:[], // categories  //  up to 6   // -->   field of theyr intrest for suggest and advertise
                            followings: [], // userIds
                            rate:{
                                number:0.0,
                                counts:0,
                            },
                            verified:{
                                emailVerified : false,
                                phoneVerified : false,
                                email:"",
                                sms:""
                            },
                            boughtImages:[],// {post Id,receipt Id}
                            followersCount:0,
                            followingsCount:0,
                            phoneNumber:"",
                            viedPosts:[],
                            details:{
                                phoneNumber : "",
                                bio: ""
                            },
                            badges:[], // [{"badgid":"kajshdkdass","badsgName":"Feloaskd","badgePictureUrl":"akjsdhkulkj.png"}]
                            privacy:false,
                            inactivate:false,
                            ban:{
                                is:false,
                                expire:0,
                            },

                        };
                        User.create(req,res,userObject);
                        redisClient.hmset([userObject.userId.toString()+":info","username" , userObject.username.toString(),"privacy" , userObject.isPrivate.toString(),"emailVerified"  ,"false", "phoneVerified"  , "false"]);
                        redisClient.set(userObject.username + ":userId",userObject.userId);

                        // sendVerificationEmail();
                        // push wellcome logins notifs and messages and shit
                    }
                });
            }
        });
    },
    initialUpload:function(req,res,user){
        if(req.body.type==="post") {
            redisClient.get(user.userId+"::uploadingPost",function(err,postId){
                if(err) throw err;
                if(postId){
                    res.send(postId);
                    redisClient.expire(user.userId+"::uploadingPost",300000,function(err,result){
                        console.log(result);
                    }); // 5 minutes
                }
                else {
                    redisClient.set(user.userId+"::isUploadingPost",true,function(err,callback){
                        if(err) throw err;
                        console.log(user.userId+"::isUploadingPost");
                        redisClient.expire(user.userId+"::isUploadingPost",60000); // 1 minutes
                        redisClient.del(user.userId+"::isUploadingAlbum");
                        res.send(true);
                    });
                }
            });
        }
        else if(req.body.type==="album") {
            redisClient.get(user.username+"::uploadingAlbum",function(err,albumId){
                if(err) throw err;
                if(albumId) {
                    res.send(albumId);
                    redisClient.expire(user.username+"::uploadingAlbum",300000); // 5 minutes
                }
                else{
                    redisClient.set(user.username+"::isUploadingAlbum",true,function(err,callback){
                        if(err) throw err;
                        redisClient.expire(user.username+"::isUploadingAlbum",60000); // 1 minutes
                        redisClient.del(user.username+"::isUploadingPost");
                        res.send(true);
                    });
                }
            });
        }
        else{
            res.send({result:false,message:"Oops"});
        }
    },
    removeUploading:function(user){
        redisClient.del(user.username+"::isUploadingAlbum");
        redisClient.del(user.username+"::isUploadingPost");
        redisClient.del(user.username+"::uploadingAlbum");
        redisClient.del(user.username+"::uploadingPost");
    },
    extendExpiration:function(user){
        redisClient.get(user.userId + ":online",function(err,value){
           if(!value){
               redisClient.set(user.userId + ":online",true);
           }
           redisClient.expire(user.userId + ":online",15000);
        });
        
    },

    block:function(req,res,user){

    },
    disconnect:function(req,res,user){
        // remove both follows
    },
    unblock:function(req,res,user){

    },

    getHostProfile:function(req,res,user){ // no privacy considered !.
        var hostUsername = req.body.host;
        userSchema.findOne({username:hostUsername},{username:1,fullName:1,privacy:1,userId:1,followersCount:1,followingsCount:1,city:1,roles:1},function(err,userx){
            if(err) res.send(err);
            if(userx) {
                var response = {user:userx , following:false,followed:false};
                if(user===null){
                    res.send({user:userx,following:null,followed:null});
                }
                else {
                    if (user.username === hostUsername) {
                        res.send({user: userx, following: null, followed: null});
                    }
                    else {
                        if (userx.followings.indexOf(user.username) > -1) {
                            response.followed = true;
                        }
                        if (user.followings.indexOf(hostUsername) > -1) {
                            response.following = true;
                        }
                        res.send(response);
                    }
                }
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
            res.send({result:false,false:"sorry you cant change your info till your ban expires : "+(user.ban.expire - Date.now()) });
        }
    },

    update: function(req, res,next,data) {
        var updateuser = req.body;
        var id = req.params.id;
        data[id] = updateuser; // Spoof a DB call
        res.json(updateuser);
    },

    delete: function(req, res,next) {

        res.send(false);
    }
};

module.exports = users;