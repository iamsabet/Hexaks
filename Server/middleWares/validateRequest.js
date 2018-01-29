var jwt = require('jwt-simple');
var validateUser = require('../routes/auth').validateUser;

module.exports = function(req, res,fn) {

    // When performing a cross domain request, you will recieve
    // a preflighted request first. This is to check if our the app
    // is safe.
    // We skip the token outh for [OPTIONS] requests.
    if(req.method === 'OPTIONS') next();
    var cookiesList = parseCookies(req);

    var token = (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'] || cookiesList["X-ACCESS-TOKEN"];
    var key = (req.body && req.body.x_key) || (req.query && req.query.x_key) || req.headers['x-key'] || cookiesList["KEY"];

    if (token && key ) {
        try {
            var decoded = jwt.decode(token,require('../config/secret.js')());

            if (decoded.exp <= Date.now()) {
                res.status(400);
                res.json({
                    "status": 400,
                    "message": "Token Expired"
                });
                return;
            }
            // Authorize the user to see if s/he can access our resources
            validateUser(key,function(callback){
                var userObject = callback;
            // The key would be the logged in user's username
                if (userObject) {
                    var rolesList = userObject.roles;
                    console.log(req.url);
                    if ((((req.url.indexOf('admin') >= 0) || (req.url.indexOf('curator') >= 0) || (req.url.indexOf('blogger') >= 0) || (req.url.indexOf('premium') >= 0))
                            && (rolesList.indexOf('admin') > -1 || rolesList.indexOf('sabet') > -1 ))|| (req.url.indexOf('admin') < 0 && req.url.indexOf('/api/v1/') >= 0)) {
                        return fn(userObject);
                    }
                    else if (req.url.indexOf('curator') >= 0 && rolesList.indexOf('curator') > -1) {
                        return fn(userObject);
                    }
                    else if (req.url.indexOf('blogger') >= 0 && rolesList.indexOf('blogger') > -1){
                        return fn(userObject);
                    }
                    else if (req.url.indexOf('premium') >= 0 && rolesList.indexOf('premium') > -1) {
                        return fn(userObject);
                    }
                    else if(req.url.indexOf('premium') ===-1 && req.url.indexOf('blogger') ===-1 || req.url.indexOf('curator') === -1 || req.url.indexOf('sabet') === -1 || req.url.indexOf('admin') === -1){
                        return fn(userObject)
                    }
                    else {
                        res.status(403);
                        res.json({
                            "status": 403,
                            "message": "Not Authorized"
                        });
                        return null;
                    }
                } else {
                    // No user with this name exists, respond back with a 401
                    res.status(401);
                    res.json({
                        "status": 401,
                        "message": "Invalid User"
                    });
                    return;
                }
            });
        } catch (err) {
            res.status(500);
            res.json({
                "status": 500,
                "message": "Oops something went wrong",
                "error": err
            });
        }
    } else {

        return fn(null); // Not Signed
    }
    function parseCookies (request) {
        var list = {},
            rc = request.headers.cookie;
        rc && rc.split(';').forEach(function( cookie ) {
            var parts = cookie.split('=');
            list[parts.shift().trim()] = decodeURI(parts.join('='));
        });

        return list;
    }
};