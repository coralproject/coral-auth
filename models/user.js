const mongoose = require('../mongoose');
const uuid = require('uuid');
const ProfileSchema = require('./profile').Schema;

const UserSchema = new mongoose.Schema({
  id: String,
  displayName: String,
  password: String,
  profiles: [ProfileSchema]
});

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
      id: uuid.v4(),
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
}

const User = mongoose.model('User', UserSchema);

module.exports = User;
module.exports.Schema = UserSchema;
