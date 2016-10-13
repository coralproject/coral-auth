const passport = require('passport');
const User = require('./models/user');
const debug = require('debug')('coral-auth:passport');

//==============================================================================
// SESSION SERIALIZATION
//==============================================================================

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findOne({
    id: id
  }, (err, user) => {
    if (err) {
      return done(err);
    }

    return done(null, user);
  });
});

/**
 * Validates that a user is allowed to login.
 * @param {User}     user the user to be validated
 * @param {Function} done the callback for the validation
 */
function ValidateUserLogin(user, done) {
  if (!user) {
    return done(new Error('user not found'));
  }

  if (user.disabled) {
    return done(new Error('user disabled'));
  }

  return done(null, user);
}

//==============================================================================
// STRATEGIES
//==============================================================================

var ENABLED = {};

function has_enabled() {
  let args = [];

  for (let i = 0; i < arguments.length; i++) {
    args.push(arguments[i]);
  }

  return args.every((key) => process.env[key] && process.env[key] !== '');
}

// LOCAL

const LocalStrategy = require('passport-local').Strategy;

passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, (email, password, done) => {
  User.findLocalUser(email, password, (err, user) => {
    if (err) {
      return done(err);
    }

    if (!user) {
      return done(null, false, {message: 'Incorrect email/password combination'});
    }

    return ValidateUserLogin(user, done);
  });
}));

// FACEBOOK

ENABLED.facebook = has_enabled('FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET');

if (ENABLED.facebook) {

  debug('FACEBOOK provider enabled');

  const FacebookStrategy = require('passport-facebook').Strategy;

  passport.use(new FacebookStrategy({
      clientID: process.env.CORAL_AUTH_FACEBOOK_APP_ID,
      clientSecret: process.env.CORAL_AUTH_FACEBOOK_APP_SECRET,
      callbackURL: `${process.env.CORAL_AUTH_ROOT_URL}/connect/facebook/callback`
    }, (accessToken, refreshToken, profile, done) => {
      User.findOrCreateExternalUser(profile, (err, user) => {
        if (err) {
          return done(err);
        }

        return ValidateUserLogin(user, done);
      });
    }
  ));

} else {
  debug('FACEBOOK provider is disabled');
}

// TWITTER

ENABLED.twitter = has_enabled('TWITTER_CONSUMER_KEY', 'TWITTER_CONSUMER_SECRET');

if (ENABLED.twitter) {

  debug('TWITTER provider enabled');

  const TwitterStrategy = require('passport-twitter').Strategy;

  passport.use(new TwitterStrategy({
      consumerKey: process.env.CORAL_AUTH_TWITTER_CONSUMER_KEY,
      consumerSecret: process.env.CORAL_AUTH_TWITTER_CONSUMER_SECRET,
      callbackURL: `${process.env.CORAL_AUTH_ROOT_URL}/connect/twitter/callback`
    }, (token, tokenSecret, profile, done) => {
      User.findOrCreateExternalUser(profile, (err, user) => {
        if (err) {
          return done(err);
        }

        return ValidateUserLogin(user, done);
      });
    }
  ));

} else {
  debug('TWITTER provider is disabled');
}

// GOOGLE

ENABLED.google = has_enabled('GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET');

if (ENABLED.google) {

  debug('GOOGLE provider enabled');

  const GoogleStrategy = require('passport-google-oauth20').Strategy;

  passport.use(new GoogleStrategy({
      clientID: process.env.CORAL_AUTH_GOOGLE_CLIENT_ID,
      clientSecret: process.env.CORAL_AUTH_GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.CORAL_AUTH_ROOT_URL}/connect/google/callback`
    }, (accessToken, refreshToken, profile, done) => {
      User.findOrCreateExternalUser(profile, (err, user) => {
        if (err) {
          return done(err);
        }

        return ValidateUserLogin(user, done);
      });
    }
  ));

} else {
  debug('GOOGLE provider is disabled');
}

module.exports = passport;
module.exports.ENABLED = ENABLED;
