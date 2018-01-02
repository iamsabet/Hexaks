// config/passport.js

// load all the things we need
var LocalStrategy   = require('passport-local').Strategy;
// load up the user model
var User = require('../models/user.model');

// expose this function to our app using module.exports
module.exports = function(passport) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function (id, done) {
        User.findById(id, function (err, user) {
            done(err, user);
        });
    });

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-register', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField: 'username',
            passwordField: 'password',
            passReqToCallback: true, // allows us to pass back the entire request to the callback
            passResToCallback: true // allows us to pass back the entire request to the callback
        },
        function (req, username, password, done, res) {
            // asynchronous
            // User.findOne wont fire unless data is sent back
            process.nextTick(function () {

                // find a user whose email is the same as the forms email
                // we are checking to see if the user trying to login already exists
                User.findOne({'username': username}, function (err, user) {
                    // if there are any errors, return the error
                    if (err)
                        return res.send({result: false, message: "no such user found"});

                    // check to see if theres already a user with that email
                    if (user) {
                        res.send({result: false, message: "username " + username + " is already taken."});
                    } else {

                        // if there is no user with that email
                        // create the user
                        var newUser = new User();
                        // set the user's local credentials
                        newUser.username = username;
                        newUser.email = req.body["email"];
                        newUser.fullName = req.body["fullName"];
                        newUser.password = newUser.generateHash(password);

                        // save the user
                        newUser.save(function (err) {
                            if (err)
                                throw err;
                            return done(null, newUser);
                        });
                    }

                });

            });

        }));

    passport.use('local-login', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField: 'username',
            passwordField: 'password',
            passReqToCallback: true, // allows us to pass back the entire request to the callback
            passResToCallback: true // allows us to pass back the entire request to the callback
        },
        function (req, email, password, done,res) { // callback with email and password from our form

            // find a user whose email is the same as the forms email
            // we are checking to see if the user trying to login already exists
            User.findOne({'username': username}, function (err, user) {
                // if there are any errors, return the error before anything else
                if (err)
                    res.send({result:false,message:"oops Something Went Wrong"});

                // if no user is found, return the message
                if (!user)

                    User.findOne({'email': username}, function (err, user) {
                        if(err)
                            res.send({result:false,message:"oops Something Went Wrong"});
                        if(!user)
                            res.send({result: false, message: 'no such user with this username or email not found'}); // req.flash is the way to set flashdata using connect-flash}
                    });
                // if the user is found but the password is wrong
                if (!user.validPassword(password))
                    res.send({result:false, message:'Oops! Wrong password.'}); // create the loginMessage and save it to session as flashdata

                // all is well, return successful user
                return done(null, user);
            });

        }));
};
