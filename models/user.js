var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    passportLocalMongoose = require('passport-local-mongoose');

var User = new Schema({}
    /*username: {
		type: String,
		unique: true,
		required: true,
		trim: true
	},
    password: {
		type: String,
		required: true
	}
}*/, { collection: 'fcc_barhoppers' });

User.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', User);
