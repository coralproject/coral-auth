const mongoose = require('../mongoose');
const uuid = require('uuid');
const ProfileSchema = require('./profile').Schema;
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

const UserSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuid.v4,
    unique: true
  },
  displayName: String,
  password: String,
  profiles: [ProfileSchema]
});

// Add the indixies on the user profile data.
UserSchema.index({
  'profiles.id': 1,
  'profiles.provider': 1
}, {
  unique: true,
  background: false
});

/**
 * toJSON overrides to remove the password field from the json
 * output.
 */
UserSchema.options.toJSON = {};
UserSchema.options.toJSON.hide = 'password';
UserSchema.options.toJSON.transform = (doc, ret, options) => {
  if (options.hide) {
    options.hide.split(' ').forEach((prop) => {
      delete ret[prop];
    });
  }

  return ret;
};

/**
 * Finds a user given their email address that we have for them in the system
 * and ensures that the retuned user matches the password passed in as well.
 * @param  {string}   email     - email to look up the user by
 * @param  {string}   password  - password to match against the found user
 * @param  {Function} done     [description]
 */
UserSchema.statics.findLocalUser = function(email, password, done) {
  User.findOne({
    profiles: {
      $elemMatch: {
        id: email,
        provider: 'local'
      }
    }
  }, (err, user) => {
    if (err) {
      return done(err);
    }

    if (!user) {
      return done(null, false);
    }

    bcrypt.compare(password, user.password, (err, res) => {
      if (err) {
        return done(err);
      }

      if (!res) {
        return done(null, false);
      }

      return done(null, user);
    });
  });
};

/**
 * Finds a user given a social profile and if the user does not exist, creates
 * them.
 * @param  {Object}   profile - User social/external profile
 * @param  {Function} done    [description]
 */
UserSchema.statics.findOrCreateExternalUser = function(profile, done) {
  User.findOne({
    profiles: {
      $elemMatch: {
        id: profile.id,
        provider: profile.provider
      }
    }
  }, (err, user) => {
    if (err) {
      return done(err);
    }

    if (user) {
      return done(null, user);
    }

    // The user was not found, lets create them!
    user = new User({
      displayName: profile.displayName,
      profiles: [
        {
          id: profile.id,
          provider: profile.provider
        }
      ]
    });

    user.save((err) => {
      if (err) {
        return done(err);
      }

      return done(null, user);
    });
  });
};

/**
 * Creates the local user with a given email, password, and name.
 * @param  {String}   email       email of the new user
 * @param  {String}   password    plaintext password of the new user
 * @param  {String}   displayName name of the display user
 * @param  {Function} done        callback
 */
UserSchema.statics.createLocalUser = function(email, password, displayName, done) {
  bcrypt.hash(password, SALT_ROUNDS, (err, hashedPassword) => {
    if (err) {
      return done(err);
    }

    let user = new User({
      displayName: displayName,
      password: hashedPassword,
      profiles: [
        {
          id: email,
          provider: 'local'
        }
      ]
    });

    user.save((err) => {
      if (err) {
        return done(err);
      }

      return done(null, user);
    });
  });
};

const User = mongoose.model('User', UserSchema);

module.exports = User;
module.exports.Schema = UserSchema;
