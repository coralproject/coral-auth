const express = require('express');
const router = express.Router();

const passport = require('../passport');

//==============================================================================
// STRATEGIES
//==============================================================================

// LOCAL

router.post('/local', passport.authenticate('local', {successRedirect: '/connect', failureRedirect: '/connect/authorize?error=invalid_request'}));

// FACEBOOK

if (passport.ENABLED.facebook) {
  router.get('/facebook', passport.authenticate('facebook', {failureRedirect: '/connect/authorize?error=error'}));
  router.get('/facebook/callback', passport.authenticate('facebook', {successRedirect: '/connect', failureRedirect: '/connect/authorize?error=invalid_request'}));
}

// TWITTER

if (passport.ENABLED.twitter) {
  router.get('/twitter', passport.authenticate('twitter', {failureRedirect: '/connect/authorize?error=error'}));
  router.get('/twitter/callback', passport.authenticate('twitter', {successRedirect: '/connect', failureRedirect: '/connect/authorize?error=invalid_request'}));
}

// GOOGLE

if (passport.ENABLED.google) {
  router.get('/google', passport.authenticate('google', {scope: ['profile'], failureRedirect: '/connect/authorize?error=error'}));
  router.get('/google/callback', passport.authenticate('google', {successRedirect: '/connect', failureRedirect: '/connect/authorize?error=invalid_request'}));
}

module.exports = router;
