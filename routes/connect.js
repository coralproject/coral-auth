const express = require('express');
const router = express.Router();
const url = require('url');
const crypto = require('crypto');
const querystring = require('querystring');
const debug = require('debug')('coral-auth:oidc');

const Token = require('../token');
const passport = require('../passport');

/**
 * Validates the request_uri parameter to ensure that it is allowed to talk to
 * us with the matching client_id.
 *
 * @param {String} client_id - the client_id to check against
 * @param {String} uri       - the uri to check if it matches our callback param
 */
const ValidateClient = function(client_id, uri) {
  let clients = process.env.ALLOWED_CLIENTS.split(' ');

  // Find the client in the list.
  let clientIDX = clients.indexOf(client_id);
  if (clientIDX === -1) {
    return false;
  }

  // Find the uri in the list.
  let uriIDX = clients.indexOf(uri);
  if (uriIDX === -1) {
    return false;
  }

  // Check to see if this client is associated with this callback uri.
  if (uriIDX - clientIDX !== 1) {
    return false;
  }

  return true;
};

const ValidateNonce = function(nonce) {
  if (nonce && nonce.length > 0) {
    return true;
  }

  return false;
};

/**
 * Adds the object to the hash of the uri.
 * @param {String} uri   the uri to be parsed and formatted
 * @param {Object} obj   the object to be added as the hash
 */
const AddObjectToHash = function(uri, obj) {
  let u = url.parse(uri, true);

  u.hash = querystring.stringify(obj);

  return url.format(u);
}

/**
 * Display the login form for the user and/or redirect if there's an error on
 * the request.
 */
router.get('/authorize', (req, res, next) => {
  let err = req.query.error;

  if (err) {
    // TODO: log the error

    if (req.session && req.session.redirect_uri) {
      let redirect_uri = AddObjectToHash(req.session.redirect_uri, {
        error: err
      });

      return res.redirect(redirect_uri);
    }

    var error = new Error('authorization failed');
    error.status = 401;

    return next(error);
  }

  next();
}, (req, res, next) => {

  // Check the redirect_uri parameter that was provided.
  let client_id = req.query.client_id;

  if (!client_id) {
    return next(new Error('client_id is required'));
  }

  let redirect_uri = req.query.redirect_uri;

  if (!redirect_uri) {
    return next(new Error('redirect_uri is required'));
  }

  if (!ValidateClient(client_id, redirect_uri)) {
    return next(new Error('invalid redirect_uri param'));
  }

  // redirect_uri is required as per https://openid.net/specs/openid-connect-core-1_0.html#ImplicitAuthRequest
  req.session.client_id = client_id;
  req.session.redirect_uri = redirect_uri;

  let nonce = req.query.nonce;

  if (!nonce) {
    return next(new Error('nonce is required'));
  } else if (!ValidateNonce(nonce)) {
    return next(new Error('invalid nonce token param'));
  }

  // nonce is required as per https://openid.net/specs/openid-connect-core-1_0.html#ImplicitAuthRequest
  req.session.nonce = nonce;

  if (req.query.state) {
    req.session.state = req.query.state;
  }

  res.render('authorize', {
    csrfToken: req.csrfToken(),
    enabled: passport.ENABLED
  });
});

router.get('/', (req, res, next) => {
  if (!req.user) {
    debug('no user on the request, can\'t redirect to the redirect_uri');
    return next(new Error('no user'));
  }

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

    // Prepare the token claims.
    let id_token_claims = Token.createClaims(req.session.client_id, req.user.id);

    id_token_claims.nonce = req.session.nonce;

    // create the at_hash param
    const digest = crypto.createHash('sha384').update(access_token, 'utf8').digest();

    let digest_truncated = digest.slice(0, digest.length / 2);

    id_token_claims.at_hash = digest_truncated.toString('base64');

    // Sign the token with the given claims.
    Token.sign(id_token_claims, (err, id_token) => {
      if (err) {
        debug('can\'t sign the id_token: ' + err);
        return next(err);
      }

      // Add the token as `id_token` to the query string.

      query.id_token = id_token;

      // Add the state to the token.
      if (req.session.state) {
        query.state = req.session.state;
      }

      // Add the nonce token.
      query.nonce = req.session.nonce;

      // And merge all the state information into the url for the redirect.

      let redirect_uri = AddObjectToHash(req.session.redirect_uri, query);

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
});

//==============================================================================
// OPENID CONFIGURATION
//==============================================================================

router.get('/.well-known/openid-configuration', (req, res) => {
  res.json({
    issuer: process.env.ROOT_URL + '/connect',
    authorization_endpoint: process.env.ROOT_URL + '/connect/authorize',
    scopes_supported: ['openid'],
    registration_endpoint: process.env.ROOT_URL + '/connect/authorize',
    subject_types_supported: ['public'],
    jwks_uri: process.env.ROOT_URL + '/connect/.well-known/jwks',
    response_types_supported: ['id_token token'],
    id_token_signing_alg_values_supported: [Token.alg]
  })
});

router.get('/.well-known/jwks', (req, res) => {
  res.json(Token.jwk);
});

//==============================================================================
// STRATEGY
//==============================================================================

// Verify that we have the needed pieces inside the session.
const verifyMidware = (req, res, next) => {
  if (!req.session.redirect_uri) {
    return next(new Error('redirect_uri is required'));
  }

  if (!req.session.client_id) {
    return next(new Error('client_id is required'));
  }

  if (!req.session.nonce) {
    return next(new Error('nonce is required'));
  }

  next();
};

//==============================================================================
// STRATEGIES
//==============================================================================

// LOCAL

router.post('/local', verifyMidware, passport.authenticate('local', {successRedirect: '/connect', failureRedirect: '/connect/authorize?error=invalid_request'}));

// FACEBOOK

if (passport.ENABLED.facebook) {
  router.get('/facebook', verifyMidware, passport.authenticate('facebook', {failureRedirect: '/connect/authorize?error=error'}));
  router.get('/facebook/callback', verifyMidware, passport.authenticate('facebook', {successRedirect: '/connect', failureRedirect: '/connect/authorize?error=invalid_request'}));
}

// TWITTER

if (passport.ENABLED.twitter) {
  router.get('/twitter', verifyMidware, passport.authenticate('twitter', {failureRedirect: '/connect/authorize?error=error'}));
  router.get('/twitter/callback', verifyMidware, passport.authenticate('twitter', {successRedirect: '/connect', failureRedirect: '/connect/authorize?error=invalid_request'}));
}

// GOOGLE

if (passport.ENABLED.google) {
  router.get('/google', verifyMidware, passport.authenticate('google', {scope: ['profile'], failureRedirect: '/connect/authorize?error=error'}));
  router.get('/google/callback', verifyMidware, passport.authenticate('google', {successRedirect: '/connect', failureRedirect: '/connect/authorize?error=invalid_request'}));
}

module.exports = router;
