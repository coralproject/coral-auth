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
  disabled: Boolean,
  password: String,
  profiles: [ProfileSchema],
  roles: [String]
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
 * Merges two users together by taking all the profiles on a given user and
 * pushing them into the source user followed by deleting the destination user's
 * user account. This will not merge the roles associated with the source user.
 * @param  {String} dstUserID id of the user to which is the target of the merge
 * @param  {String} srcUserID id of the user to which is the source of the merge
 * @return {Promise}          resolves when the users are merged
 */
UserSchema.statics.mergeUsers = function(dstUserID, srcUserID) {
  let srcUser, dstUser;

  return Promise.all([
    User.findOne({id: dstUserID}).exec(),
    User.findOne({id: srcUserID}).exec()
  ]).then((users) => {
    dstUser = users[0];
    srcUser = users[1];

    srcUser.profiles.forEach((profile) => {
      dstUser.profiles.push(profile);
    });

    return srcUser.remove();
  }).then(() => dstUser.save());
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
      roles: [],
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
      roles: [],
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

/**
 * Disables a given user account.
 * @param  {String}   id   id of a user
 * @param  {Function} done callback after the operation is complete
 */
UserSchema.statics.disableUser = function(id, done) {
  User.update({
    id: id
  }, {
    $set: {
      disabled: true
    }
  }, done);
};

/**
 * Enables a given user account.
 * @param  {String}   id   id of a user
 * @param  {Function} done callback after the operation is complete
 */
UserSchema.statics.enableUser = function(id, done) {
  User.update({
    id: id
  }, {
    $set: {
      disabled: false
    }
  }, done);
};

/**
 * Adds a role to a user.
 * @param  {String}   id   id of a user
 * @param  {String}   role role to add
 * @param  {Function} done callback after the operation is complete
 */
UserSchema.statics.addRoleToUser = function(id, role, done) {
  User.update({
    id: id
  }, {
    $addToSet: {
      roles: role
    }
  }, done);
};

/**
 * Removes a role from a user.
 * @param  {String}   id   id of a user
 * @param  {String}   role role to remove
 * @param  {Function} done callback after the operation is complete
 */
UserSchema.statics.removeRoleFromUser = function(id, role, done) {
  User.update({
    id: id
  }, {
    $pull: {
      roles: role
    }
  }, done);
};

const User = mongoose.model('User', UserSchema);

module.exports = User;
module.exports.Schema = UserSchema;
