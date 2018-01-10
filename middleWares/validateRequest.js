var jwt = require('jwt-simple');
var validateUser = require('../routes/auth').validateUser;

module.exports = function(req, res, next,data) {

    // When performing a cross domain request, you will recieve
    // a preflighted request first. This is to check if our the app
    // is safe.

    // We skip the token outh for [OPTIONS] requests.
    if(req.method === 'OPTIONS') next();

    var token = (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'];
    var key = (req.body && req.body.x_key) || (req.query && req.query.x_key) || req.headers['x-key'];

    if (token && key) {
        try {
            var decoded = jwt.decode(token, require('../config/secret.js')());

            if (decoded.exp <= Date.now()) {
                res.status(400);
                res.json({
                    "status": 400,
                    "message": "Token Expired"
                });
                return;
            }

            // Authorize the user to see if s/he can access our resources

            var userObject = validateUser(key); // The key would be the logged in user's username
            if (userObject) {
                data = userObject;
                console.log(req.url);
                if ((((req.url.indexOf('admin') >= 0) || (req.url.indexOf('curator') >= 0) || (req.url.indexOf('blogger') >= 0) || (req.url.indexOf('premium') >= 0))
                        && dbUser.role === 'admin') || (req.url.indexOf('admin') < 0 && req.url.indexOf('/api/v1/') >= 0)) {
                    next(null,{some:data}); // To move to next middleware
                }
                else if ((req.url.indexOf('curator') >= 0 && dbUser.role === 'curator')) {
                    next(null,{some:data}); // To move to next middleware
                }
                else if ((req.url.indexOf('blogger') >= 0 && dbUser.role === 'blogger')) {
                    next(null,{some:data}); // To move to next middleware
                }
                else if ((req.url.indexOf('premium') >= 0 && dbUser.role === 'premium')) {
                    next(null,{some:data}); // To move to next middleware
                }

                else {
                    res.status(403);
                    res.json({
                        "status": 403,
                        "message": "Not Authorized"
                    });
                    return;
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

        } catch (err) {
            res.status(500);
            res.json({
                "status": 500,
                "message": "Oops something went wrong",
                "error": err
            });
        }
    } else {
        res.status(401);
        res.json({
            "status": 401,
            "message": "Invalid Token or Key"
        });
        return;
    }
};