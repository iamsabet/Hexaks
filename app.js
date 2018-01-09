var express  = require('express');
var app      = express();
var port     = process.env.PORT || 3000;
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var io = require("socket.io");
var requestIp = require("request-ip");
var routes = require('./routes/index');
var db = mongoose.connection;
var session = require('express-session');
var validateRequest = require('./middleWares/validateRequest');
mongoose.connect('mongodb://localhost:27017/hexaks_db', {autoIndex :true});
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log("Server Listening : "+port);
    console.log("connected to hexaks_db");
});

// routes ======================================================================

// view engine setup
app.set('views', path.join(__dirname, 'client/views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');
// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use("/", express.static(__dirname + '/client'));
app.use("/", express.static(__dirname + '/client/views'));
app.use(requestIp.mw());
// hexaks routes
//catch 404 and forward to error handler
app.use('error404',function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});
app.use('/*`r',routes);

app.all('/*', function(req, res, next) {
    // CORS headers
    res.header("Access-Control-Allow-Origin", "*"); // restrict it to the required domain
    res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    // Set custom headers for CORS
    res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key');
    if (req.method === 'OPTIONS') {
        res.status(200).end();
    } else {
        next();
    }
});
// error handler

app.all('/api/v1/*', function (req,res,next){
    validateRequest(req,res,next);
});








module.exports = app;