var express = require('express');
var passport = require('passport');
var User = require('../models/user');
var multer  = require('multer');
var dotenv = require('dotenv');
var router = express.Router();

var upload = multer();

dotenv.load();

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', { user: req.user });
});

router.get('/register', function(req, res) {
    res.render('register', { });
});

router.post('/register', upload.array(), function(req, res) {
	User.register(new User({ username : req.body.username }), req.body.password, function(err, user) {
      if (err) {
          return res.render('register', {info: "Sorry. That username already exists. Try again."});
      }

      passport.authenticate('local')(req, res, function () {
        res.redirect('/');
      });
  	});
});

router.get('/login', function(req, res){
	res.render('login', { user: req.user });
});

router.post('/login', upload.array(), passport.authenticate('local'), function(req, res) {
    res.redirect('/');
});

router.get('/logout', function(req, res){
	req.logout();
	res.redirect('/');
});

module.exports = router;
