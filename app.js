var express = require('express');
var path = require('path');
var _ = require('underscore');
//var mongodb = require("mongodb");
var mongoose = require('mongoose');
var session = require('express-session');
//var MongoStore = require('connect-mongo')(session); //let connect-mongo access session
//var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var dotenv = require('dotenv');
var passport = require('passport');
//var Auth0Strategy = require('passport-auth0');
var LocalStrategy = require('passport-local').Strategy;
var http = require('http');

dotenv.load();

var routes = require('./routes/index');
var user = require('./routes/user');

var app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.set('view options', { layout: false });

app.locals.appTitle = "FCC Nightlife app";

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
var sess = {
  	secret: 'keyboard cat',
	resave: false,
	saveUninitialized: false,
	cookie: {}/*,
	store: new MongoStore({
		mongooseConnection: db
	})*/
  
}
app.use(cookieParser(sess.secret));
if (app.get('env') === 'production') {
	app.set('trust proxy', 1) // trust first proxy
	sess.cookie.secure = true // serve secure cookies
}

app.use(session(sess))
app.use(passport.initialize());
app.use(passport.session());

// make user ID available in templates
/*app.use(function (req, res, next) {
  	res.locals.currentUser = req.session.userId;
	next();
});*/

app.use(express.static(__dirname + '/public'));

app.use('/', routes);
app.use('/users', user);

if (app.get('env') === 'production') {
	app.set('trust proxy', 1) // trust first proxy
	sess.cookie.secure = true // serve secure cookies
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('File Not Found');
	err.status = 404;
	next(err);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// error handler
// define as the last app.use callback
app.use(function(err, req, res, next) {
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});
});

var User = require('./models/user');
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

var uri = process.env.DEVDB;// || process.env.MONGOLAB_URI;

mongoose.connect(uri/*, {authMechanism: 'ScramSHA1'}*/);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

var port = process.env.PORT || 3001;

http.createServer(app).listen(port, function (err) {
	console.log('listening in http://localhost:' + port);
});

module.exports = app;
