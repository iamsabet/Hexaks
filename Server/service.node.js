var express  = require('express');
process.env.PORT = 8001;
var port     = process.env.PORT || 8001;
var app      = express();
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var requestIp = require("request-ip");
var routes = require('./routes/index');

var db = mongoose.connection;
var redis = require('redis');
var client = redis.createClient(6379, 'localhost', {no_ready_check: true});


mongoose.connect('mongodb://localhost:27017/hexaks_db');
db.on('error', console.error.bind(console, 'connection error:'));
db.openUri("mongodb://localhost:27017/hexaks_db",function() {
    console.log("connected to hexaks_db");
});
client.auth('c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna', function (err) {
    if (err) throw err;
});

client.on('connect', function() {
    console.log('Connected to Redis');
});
// routes ======================================================================

// view engine setup
app.set('views', path.join(__dirname, 'views'));
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
app.use('/*',function(req,res,next){
    console.log(req.url);
    next();
});
app.use('/',routes);
app.all('/*', function(req, res, next) {
    // CORS headers
    res.header("Access-Control-Allow-Origin", "*"); // restrict it to the required domain
    res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    // Set custom headers for CORS
    res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key');
    if (req.method === 'OPTIONS' || req.method === 'DELETE') {
        res.status(200).end();
    } else {
        next();
    }
});



// error handler










module.exports = app;