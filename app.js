var express = require('express');
var app = express();
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var index = require('./routers/index.routes');
var users = require('./routers/users.routes');
var requestIp = require('request-ip');
var io = require("socket.io");
var db = mongoose.connection;
mongoose.connect('mongodb://localhost:27017/hexaks_db', {autoIndex :true});
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log("connected to hexaks_db");
});

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
app.use('/', index);
app.use('/users', users);
app.use('/', index);
//catch 404 and forward to error handler
app.use('error404',function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler

function errorHandler(err, req, res, next){

    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    // render the error page
    res.status(err.status || 500);
    res.send(err.message + " - " +(err.status || 500));

}








module.exports = app;


