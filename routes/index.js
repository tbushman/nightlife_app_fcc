var express = require('express');
var passport = require('passport');
var Yelp = require('yelp');
var User = require('../models/user');
var multer  = require('multer');
var url = require('url');
var dotenv = require('dotenv');
var async = require("async");
var router = express.Router();

var upload = multer();

dotenv.load();

var yelp = new Yelp({
	consumer_key: process.env.YELP_CONSUMER_KEY,
	consumer_secret: process.env.YELP_CONSUMER_SECRET,
	token: process.env.YELP_TOKEN,
	token_secret: process.env.YELP_TOKEN_SECRET,
});

// test authentication middleware
function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) { 
		return next(); 
	}
	return res.redirect('/');
}

/* GET home page. */
router.get('/', function(req, res, next) {
	
	if (req.isAuthenticated()) {
		//console.log(req.user._id)
		if (req.app.locals.yelp_term) {
			return res.redirect('/api/'+req.app.locals.yelp_term+'/'+req.app.locals.yelp_city+'');
		} else {
			User.findOne({_id: req.user._id}, function(err, docs){
				if (err) {
					return next(err);
				}
				var last_search = docs.searches[docs.searches.length-1];
				if (last_search === undefined) {
					return res.render('index', { 
						user: req.user,
						data: []
					});
				} else {
					var term = last_search.term;
					var location = last_search.location;
					return res.redirect('/api/'+term+'/'+location+'');
				}
			})
		}
		
	} else {
		return res.render('index', { 
			user: req.user,
			data: []
		});
	}
	
});

router.get('/register*', function(req, res, next) {
	var outputPath = url.parse(req.url).pathname;
	var search = outputPath.replace('/register/', '');
	var yelp_city = search.split('/')[1];
	var yelp_term = search.split('/')[0];
	req.app.locals.yelp_city = yelp_city.replace('%20', '');
	req.app.locals.yelp_term = yelp_term.replace('%20', '');
	//console.log(res.locals)
    return res.render('register', { });
});

router.post('/register', upload.array(), function(req, res, next) {
	User.register(new User({ username : req.body.username }), req.body.password, function(err, user) {
		if (err) {
			return res.render('register', {info: "Sorry. That username already exists. Try again."});
		}
		passport.authenticate('local')(req, res, function () {
			if (req.app.locals.yelp_term) {
				return res.redirect('/api/'+req.app.locals.yelp_term+'/'+req.app.locals.yelp_city+'');
			} else {
				return res.redirect('/');
			}
		});
  	});
});

router.get('/login', function(req, res, next){
	return res.render('login', { 
		user: req.user 
	});
});

router.post('/login', upload.array(), passport.authenticate('local'), function(req, res, next) {
    if (req.app.locals.yelp_term) {
		return res.redirect('/api/'+req.app.locals.yelp_term+'/'+req.app.locals.yelp_city+'');
	} else {
		return res.redirect('/');
	}
});

router.get('/auth/twitter', passport.authenticate('twitter'), function(req, res, next){
	return next();
});

router.get('/auth/twitter/callback', passport.authenticate('twitter', { 
	failureRedirect: '/' 
}), function(req, res, next) {
    if (req.app.locals.yelp_term) {
		return res.redirect('/api/'+req.app.locals.yelp_term+'/'+req.app.locals.yelp_city+'');
	} else {
		return res.redirect('/');
	}
});

router.get('/logout', function(req, res, next){
	req.logout();
	return res.redirect('/');
});

router.get('/user', ensureAuthenticated, function(req, res, next){
	User.findOne({_id: req.user._id}, function(err, user) {
		if(err) {
			return next(err);  // handle errors
	    } else {
			var businesses = user.rsvp;
			
			if (businesses.length > 0) {
				var pugData = [];
				for (var i = 0; i < businesses.length; i++) {
					
					var yelp_id = businesses[i].id;
					//console.log(yelp_id)
					
					yelp.business(businesses[i].id).then(function(data){
						var result = data;
						var rsvp = [];
						User.find({rsvp: {$elemMatch: {id: result.id } }}, function(error, users){

							if (error) {
								return next(error);
							}
							for (var i in users) {
								User.findOne({_id: users[i]._id}, function(er, user){
									if (er) {
										return next(er)
									} else {
										var rsvp_profile = {
											username: user.username,
											user_id: user._id
										}
										rsvp.push(rsvp_profile);
									}
								})
							}
						});
						var entry = {
							id: result.id,
							name: result.name,
							image_url: result.image_url,
							snippet_text: result.snippet_text,
							rsvp: rsvp //array
						}
						pugData.push(entry)
					}).catch(function (err) {
						return next(err);
					});
					
				}
				setTimeout(function(){ //wait for above loops / arrays
					return res.render('user', { 
						user: req.user,
						data: pugData
					});
					
				}, 2000)
			} else {
				console.log(businesses)
				return res.render('user', { 
					user: req.user,
					data: []
				});
			}
	    }
	});
});

router.get('/search', function(req, res, next){
	return res.render('search', {
		user: req.user
	})
});

router.all('/api*', ensureAuthenticated);

router.get('/api/:term/:location', function(req, res, next) {
	var term = req.params.term;
	var location = req.params.location;
	yelp.search({ term: term, location: location }).then(function (data) {
		var results = data.businesses;
		var pugData = [];
		//console.log(data)
		
		async.map(results, getBusinessInfo, function(err, result){
			console.log(result) //array
			return res.render('index', {
				user: req.user,
				data: result
			});
		})
		/*async.forEach(results, function(result, callback){
			var yelp_id = result.id;
			var entry = {}
			loadAllRsvps(yelp_id, function(err, rsvps) {
				if (err) {
					callback(err);
				}
				//entry.rsvp = rsvps; //array
				callback(null, rsvps);
			})
			pugData.push(entry)
		}, function(er){
			if (er) {
				return next(er)
			}
			return res.render('index', {
				user: req.user,
				data: pugData
			});
			
		})*/
/*		for (var i = 0; i < results.length; i++) {
			var rsvp = [];
			var match_id = {
				id: results[i].id
			}
			var rsvp_length;
			User.find({rsvp: {$elemMatch: match_id }}, function(err, users){
				if (err) {
					return next(err);
				}
				rsvp_length = users.length;
				for (var j = 0; j < users.length; j++) {
					rsvp.push(users[j]._id);
				}
			});
			//var rsvp_length = rsvp.length;
			var entry = {
				id: results[i].id,
				name: results[i].name,
				image_url: results[i].image_url,
				snippet_text: results[i].snippet_text,
				term: term,
				city: location,
				rsvp: rsvp_length
			}
			pugData.push(entry);
		}*/
	}).catch(function (err) {
		return next(err);
	});
});

router.post('/api/all/rsvp/:id', function(){
	var yelp_id = req.params.id;
	User.find({rsvp: {$elemMatch: {id: yelp_id} } }, function(err, users){
		if (err) {
			return next(err);
		}
		var length = users.length;
		if (users.length === 0) {
			length = 0;
		}
		res.contentType('application/json');
		return res.json(length);
	});
})

router.post('/api/rsvp/:id', function(req, res, next){
	var yelp_id = req.params.id;
	var push_rsvp = {
		id: yelp_id
	}
	User.find(
		{_id: req.user._id, rsvp: {$elemMatch: push_rsvp} },
		function(error, data) {
			if (error) {
				return next(error);
			}
			if (data.length === 0) {
				User.findOneAndUpdate(
					{_id: req.user._id},
					{$push: {rsvp: push_rsvp}},
					{safe: true, upsert: true},
					function(err, docs){
						if (err) {
							return next(err);
						}
						User.find({rsvp: {$elemMatch: {id: yelp_id} } }, function(err, users){
							if (err) {
								return next(err);
							}
							var length = users.length;
							if (users.length === 0) {
								length = 0;
							}
							res.contentType('application/json');
							return res.json(length);
						});
					});
			} else {
				User.findOneAndUpdate(
					{_id: req.user._id},
					{$pull: {rsvp: {$elemMatch: {id: yelp_id}} }},
					{multi: true},
					function(err, docs){
						if (err) {
							return next(err);
						}
						//var rsvp = [];
						User.find({rsvp: {$elemMatch: {id: yelp_id} } }, function(err, users){
							if (err) {
								return next(err);
							}
							var length = users.length;
							if (users.length === 0) {
								length = 0;
							}
							res.contentType('application/json');
							return res.json(length);
						});
					})
				
			}
		}
	)
});

router.post('/search', upload.array(), function(req, res, next) {
	var term = req.body.term;
	var location = req.body.location;
	yelp.search({ term: term, location: location }).then(function (results) {
		var data = results.businesses;
		var pugData = [];
		for (var i = 0; i < data.length; i++) {
			//var match_id = data[i].id;
			var yelp_id = data[i].id;
			var yelp_name = data[i].name;
			var yelp_img = data[i].image_url;
			var yelp_txt = data[i].snippet_text;
			
			User.find({rsvp: {$elemMatch: {id: yelp_id} }}, function(err, users){
				if (err) {
					return next(err);
				}
				var rsvp_length = users.length;
				/*if (!users) {
					rsvp_length = 0;
				} else {
					rsvp_length = users.length;								
				}*/
				var entry = {
					id: yelp_id,
					name: yelp_name,
					image_url: yelp_img,
					snippet_text: yelp_txt,
					term: term,
					city: location,
					rsvp: rsvp_length
				}
				pugData.push(entry);
				
			});
		}
		console.log(pugData)
		if (req.isAuthenticated()) {
			var push_search = {
				term: term,
				location: location
			};
			User.findOneAndUpdate(
				{_id: req.user._id},
				{$push:{searches: push_search}},
				{safe: true, upsert: true},
				function(err, docs) {
					//console.log(docs)
					if (err) {
						return next(err);
					}
					return res.render('index', {
						user: req.user,
						data: pugData
					});
				} 
			);
		} else {
			return res.render('index', {
				user: req.user,
				data: pugData
			});
		}
	}).catch(function (err) {
		console.error(err);
	});
});

function getBusinessInfo(business, callback) {
	yelp.business(business.id).then(function(data){
		//var rsvp = [];
		//var rsvp_length;
		User.find({rsvp: {$elemMatch: {id: data.id} } }, function(err, users){
			if (err) {
				return callback(err);
			}
			rsvp_length = users.length;
			/*for (var i = 0; i < users.length; i++) {
				var user_profile = {
					username: users[i].username,
					user_id: users[i]._id
				}
				rsvp.push(user_profile)
			}*/
			var entry = {
				id: data.id,
				name: data.name,
				image_url: data.image_url,
				snippet_text: data.snippet_text,
				rsvp: users.length
			}
			callback(null, entry)
		});
	}).catch(function (err) {
		console.error(err);
	});
}
/*
function loadBusinessesBySearch(term, location, callback) {
	yelp.search({ term: term, location: location }).then(function (results) {
}

function loadUserRsvps(user_id, callback) {
	User.findOne({_id: user_id}, 'rsvp', function(err, rsvps) {
		if (err) {
			return callback(err);  // handle errors
	    } else {
			async.forEach(rsvps, function(bus, callback){
				
			})
	
}*/
/*function loadAllRsvps(yelp_id, callback) {
	User.find({rsvp: {$elemMatch: {id: yelp_id} } }, function(err, users){
		if (err) {
			return callback(err);
		}
		var rsvp = [];
		async.forEach(users, function(user, callback){
			var rsvp_data = {
				user_id: user._id,
				username: user.username
			}
			rsvp.push(rsvp_data);
			callback();
		}, function(err) {
			if (err) {
				return callback(err);
			}
			callback(null, rsvp);
		})		
	})
}*/

// See http://www.yelp.com/developers/documentation/v2/search_api
/*yelp.search({ term: 'food', location: 'Montreal' }).then(function (data) {
	console.log(data);
}).catch(function (err) {
	console.error(err);
});

// A callback based API is also available:
yelp.business('yelp-san-francisco', function(err, data) {
  if (err) return console.log(error);
  console.log(data);
});*/



module.exports = router;
