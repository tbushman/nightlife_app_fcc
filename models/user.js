var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    passportLocalMongoose = require('passport-local-mongoose');

var User = new Schema({
	username: String,
	password: String,
	twitter: {
		oauthID: Number,
		name: String,
		created: Date
	},
	searches: [{
		term: String,
		location: String
	}],
	rsvp: [{
		id: String,
		location: String
	}]
}, { collection: 'fcc_barhoppers' });

User.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', User);
