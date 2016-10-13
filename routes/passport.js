const express = require('express');
const router = express.Router();

const passport = require('../passport');

const successRedirect = process.env.CORAL_AUTH_ROOT_URL + '/connect';
const failureRedirect = process.env.CORAL_AUTH_ROOT_URL + '/connect/authorize?error=invalid_request';

//==============================================================================
// STRATEGIES
//==============================================================================

// LOCAL

router.post('/local', passport.authenticate('local', {
  successRedirect: successRedirect,
  failureRedirect: failureRedirect
}));

// FACEBOOK

if (passport.ENABLED.facebook) {
  router.get('/facebook', passport.authenticate('facebook', {
    failureRedirect: failureRedirect
  }));

  router.get('/facebook/callback', passport.authenticate('facebook', {
    successRedirect: successRedirect,
    failureRedirect: failureRedirect
  }));
}

// TWITTER

if (passport.ENABLED.twitter) {
  router.get('/twitter', passport.authenticate('twitter', {
    failureRedirect: failureRedirect
  }));

  router.get('/twitter/callback', passport.authenticate('twitter', {
    successRedirect: successRedirect,
    failureRedirect: failureRedirect
  }));
}

// GOOGLE

if (passport.ENABLED.google) {
  router.get('/google', passport.authenticate('google', {
    scope: ['profile'],
    failureRedirect: failureRedirect
  }));

  router.get('/google/callback', passport.authenticate('google', {
    successRedirect: successRedirect,
    failureRedirect: failureRedirect
  }));
}

module.exports = router;
