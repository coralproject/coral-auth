const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const base64url = require('base64-url');
const util = require('../util');
const debug = require('debug')('coral-auth:passport-routes');
const Token = require('../token');

const passport = require('../passport');

const authorizeURL = process.env.CORAL_AUTH_ROOT_URL + '/connect/authorize'

//==============================================================================
// Authentication Callback
//==============================================================================

const SuccessCallbackHandler = function(req, res, next) {

  // We are now composing the redirect url that we will use to forwawrd the
  // request.

  let query = {};

  let access_token_claims = {
    scopes: []
  };

  Token.sign(access_token_claims, (err, access_token) => {
    if (err) {
      debug('can\'t sign the access_token: ' + err);
      return next(err);
    }

    query.access_token = access_token;
    query.token_type = 'bearer';
    query.expires_in = Token.expiresIn;

    let ar = util.AuthorizationRequest.unserialize(req.session);

    // Prepare the token claims.
    let id_token_claims = Token.createClaims(ar.client_id, req.user.id);

    id_token_claims.nonce = ar.nonce;

    // create the at_hash param
    const digest = crypto.createHash('sha384').update(access_token, 'utf8').digest();

    let digest_truncated = digest.slice(0, digest.length / 2);

    id_token_claims.at_hash = base64url.escape(digest_truncated.toString('base64'));

    // Sign the token with the given claims.
    Token.sign(id_token_claims, (err, id_token) => {
      if (err) {
        debug('can\'t sign the id_token: ' + err);
        return next(err);
      }

      // Add the token as `id_token` to the query string.

      query.id_token = id_token;

      // Add the state to the token.
      if (ar.state) {
        query.state = ar.state;
      }

      // Add the nonce token.
      query.nonce = ar.nonce;

      // And merge all the state information into the url for the redirect.

      let redirect_uri = util.AddObjectToHash(ar.redirect_uri, query);

      // We are now redirecting the user to the new url... we should log out.

      req.logout();

      // And since we're logging out, we'll also flush our session.

      req.session.destroy((err) => {
        if (err) {
          return next(err);
        }

        // And redirect the user to the new redirect uri as per the OpenID Connect
        // spec.

        res.redirect(redirect_uri);
      });
    });
  });
};

const AuthenticationCallbackHandler = function(req, res, next) {
  return function(err, user, info) {
    if (err) {
      return next(err);
    }

    if (!user) {

      // There is no user on the request, so we should flash the error that
      // was returned and send the user back to the authorize endpoint.
      if (info && info.message) {
        req.flash('error', info.message);
      }

      let redirect_uri = util.AddObjectToQuery(authorizeURL, req.ar);

      return res.redirect(redirect_uri);
    }

    // There was no error logging in the user and we have the user details all
    // here so we should perform the success redirect.
    req.logIn(user, function(err) {
      if (err) {
        return next(err);
      }

      // The login was successful
      return SuccessCallbackHandler(req, res, next);
    });
  };
}

const HandleExternalProvider = function(provider, options) {
  router.get('/' + provider, (req, res, next) => {
    passport.authenticate(provider, options, AuthenticationCallbackHandler(req, res, next))(req, res, next);
  });

  router.get('/' + provider + '/callback', (req, res, next) => {
    passport.authenticate(provider, options, AuthenticationCallbackHandler(req, res, next))(req, res, next);
  });
}

//==============================================================================
// STRATEGIES
//==============================================================================

// LOCAL

router.post('/local', (req, res, next) => {
  passport.authenticate('local', AuthenticationCallbackHandler(req, res, next))(req, res, next);
});

// FACEBOOK

if (passport.ENABLED.facebook) {
  HandleExternalProvider('facebook', {});
}

// TWITTER

if (passport.ENABLED.twitter) {
  HandleExternalProvider('twitter', {});
}

// GOOGLE

if (passport.ENABLED.google) {
  HandleExternalProvider('google', {
    scope: ['profile']
  });
}

module.exports = router;
