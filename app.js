var fs = require('fs');
var express = require('express');
var path = require('path');
var _ = require('underscore');
var mongoose = require('mongoose');
var session = require('express-session');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var dotenv = require('dotenv');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;
var http = require('http');

dotenv.load();

var routes = require('./routes/index');

var User = require('./models/user');

passport.use(new LocalStrategy(User.authenticate()));
passport.use(new TwitterStrategy({
	consumerKey: process.env.TWITTER_CONSUMER_KEY,
	consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
	callbackURL: process.env.TWITTER_CALLBACK_URL
	},
	function(accessToken, refreshToken, profile, done) {
		User.findOne({ 'twitter.oauthID': profile.id }, function(err, user) {
			if(err) {
				console.log(err);  // handle errors!
			}
			if (!err && user !== null) {
				done(null, user);
			} else {
	       		user = new User({
					username: profile.displayName,
					twitter: {
						oauthID: profile.id,
						name: profile.displayName,
						created: Date.now()
					}
		        });
				user.save(function(err) {
					if(err) {
						console.log(err);  // handle errors!
					} else {
						console.log("saving user ...");
						done(null, user);
					}
		        });
			}
	    });
	}
));
// serialize and deserialize
passport.serializeUser(function(user, done) {
  //console.log('serializeUser: ' + user._id);
  done(null, user._id);
});
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user){
    //console.log(user);
      if(!err) done(null, user);
      else done(err, null);
    });
});

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
	cookie: {}
}
app.use(cookieParser(sess.secret));
if (app.get('env') === 'production') {
	app.set('trust proxy', 1) // trust first proxy
	sess.cookie.secure = true // serve secure cookies
}

app.use(session(sess))
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(__dirname + '/public'));

app.use('/', routes);

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


var uri = process.env.MONGOLAB_URI; //process.env.DEVDB || process.env.MONGOLAB_URI;

mongoose.connect(uri, {authMechanism: 'ScramSHA1'});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

var port = process.env.PORT || 3001;

http.createServer(app).listen(port, function (err) {
	console.log('listening in http://localhost:' + port);
});

