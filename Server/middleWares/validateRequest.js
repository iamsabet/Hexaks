var jwt = require('jwt-simple');
var validateUser = require('../routes/auth').validateUser;
var usr = require('../routes/users');
let secret = require("../config/secret");
module.exports = function(req, res,fn) {

    // When performing a cross domain request, you will recieve
    // a preflighted request first. This is to check if our the app
    // is safe.
    // We skip the token outh for [OPTIONS] requests.
    if(req.method === 'OPTIONS') next();
    let cookiesList = parseCookies(req);

    let token = (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'] || cookiesList["X-ACCESS-TOKEN"];

    if (token) {
        try {
            let decoded = jwt.decode(token,secret.mongoKey);

            if (decoded.exp <= Date.now()) {
                return fn({result:false,
                    "status": 400,
                    message:"Token Expired"
                });

            }
            // Authorize the user to see if s/he can access our resources
            validateUser(decoded.key,function(callback){
                if(!callback.message) {
                    let userObject = callback;
                    // The key would be the logged in user's username
                    if (userObject) {
                        usr.extendExpiration(userObject);
                        console.log(userObject.roles);
                        let rolesList = userObject.roles;
                        if ((rolesList.indexOf('superuser') > -1) || (rolesList.indexOf('sabet') > -1)) {
                            return fn(userObject);
                        }
                        else if ((req.url.indexOf('admin') > -1) && ((rolesList.indexOf('superuser') > -1 || rolesList.indexOf('sabet') > -1 || rolesList.indexOf('admin') > -1))) {
                            return fn(userObject);
                        }
                        else if (req.url.indexOf('curator') >= 0 && (rolesList.indexOf('curator') > -1 || rolesList.indexOf('superuser') > -1 || rolesList.indexOf('sabet') > -1 || rolesList.indexOf('admin') > -1)) {
                            return fn(userObject);
                        }
                        else if (req.url.indexOf('blogger') >= 0 && (rolesList.indexOf('blogger') > -1 || rolesList.indexOf('superuser') > -1 || rolesList.indexOf('sabet') > -1 || rolesList.indexOf('admin') > -1)) {
                            return fn(userObject);
                        }
                        else if (req.url.indexOf('premium') >= 0 && (rolesList.indexOf('premium') > -1 || rolesList.indexOf('superuser') > -1 || rolesList.indexOf('sabet') > -1 || rolesList.indexOf('admin') > -1)) {
                            return fn(userObject);
                        }
                        else if (req.url.indexOf('premium') === -1 && req.url.indexOf('blogger') === -1 || req.url.indexOf('curator') === -1 || req.url.indexOf('superuser') === -1 || req.url.indexOf('admin') === -1) {
                            return fn(userObject)
                        }
                        else {
                            return fn({
                                result: false,
                                "status": 401,
                                message: "Not Authorized"
                            });
                        }
                    } else {
                        // No user with this name exists, respond back with a 401
                        return fn({
                            result: false,
                            "status": 403,
                            message: "Not Authenticated"
                        });
                    }
                }
                else{
                    return fn(callback);
                }
            });
        } catch (err) {
            return fn({result:false,
                "status": 403,
                message:"Not Authenticated"
            });
        }
    } else {

        return fn({result:false,
            "status": 403,
            message:"No Authenticated"
        });
    }
    function parseCookies (request) {
        let list = {},
            rc = request.headers.cookie;
        rc && rc.split(';').forEach(function( cookie ) {
            let parts = cookie.split('=');
            list[parts.shift().trim()] = decodeURI(parts.join('='));
        });

        return list;
    }
};