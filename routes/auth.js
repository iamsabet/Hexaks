var jwt = require('jwt-simple');
var userSchema = require('../models/user.model');
var auth = {

    login: function(req, res) {

        var username = req.body["username"] || '';
        var password = req.body["password"] || '';
        console.log(username + " --- " + password);
        if (username === '' || password === '') {
            res.status(401);
            res.json({
                "status": 401,
                "message": "Invalid credentials"
            });
            return;
        }

        // Fire a query to your DB and check if the credentials are valid
        auth.validate(username, password,function(callback){
            var userDbObject = callback;

            if (!userDbObject) { // If authentication fails, we send a 401 back
                res.status(401);
                res.json({
                    "status": 401,
                    "message": "Invalid credentials"
                });
                return;
            }

            if (userDbObject) {
                console.log(callback);
                res.send(genToken(userDbObject));
            }
        });



    },

    validate: function(username, password,callback) {
        // spoofing the DB response for simplicity
        userSchema.findOne({username:username,password:password},{_id:0,username:1,fullName:1},function(err,user){
            if(err) throw err;
            if(user) {

                return callback(user);
            }
            else {
                return callback(null);
            }
        });
    },

    validateUser: function(userId) {
        // spoofing the DB response for simplicity
        userSchema.findOne({userId:userId},{_id:0,username:1,userId:1,fullName:1},function(err,user){
            if(err) throw err;
            if(user) {
                return user;
            }
            else {
                return null;
            }
        });
    }
};

// private method
function genToken(user) {
    var expires = expiresIn(7); // 7 days
    var token = jwt.encode({
        exp: expires
    }, require('../config/secret')());

    return {
        token: token,
        expires: expires,
        user: user
    };
}

function expiresIn(numDays) {
    var dateObj = new Date();
    return dateObj.setDate(dateObj.getDate() + numDays);
}

module.exports = auth;