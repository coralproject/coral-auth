const express = require('express');
const router = express.Router();
const util = require('../util');

const Token = require('../token');
const passport = require('../passport');



/**
 * Display the login form for the user and/or redirect if there's an error on
 * the request.
 */
router.get('/authorize', (req, res, next) => {

  let err = req.query.error;

  if (err) {

    // Log out the error to the console.
    console.error(err);

    // Pull out the AuthorizationRequest from the session.
    let ar = util.AuthorizationRequest.unserialize(req.session);

    if (ar && ar.redirect_uri) {
      let redirect_uri = util.AddObjectToHash(ar.redirect_uri, {
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

  // Validate the AuthorizationRequest from the querystring.
  util.AuthorizationRequest.validate(req.query, (err, ar) => {
    if (err) {
      return next(err);
    }

    // Save the AuthorizationRequest on the session.
    util.AuthorizationRequest.serialize(req.session, ar);

    res.render('authorize', {
      env: process.env,
      csrfToken: req.csrfToken(),
      enabled: passport.ENABLED,
      errors: req.flash('error')
    });
  });
});

//==============================================================================
// OPENID CONFIGURATION
//==============================================================================

router.get('/.well-known/openid-configuration', (req, res) => {
  res.json({
    issuer: process.env.CORAL_AUTH_ROOT_URL + '/connect',
    authorization_endpoint: process.env.CORAL_AUTH_ROOT_URL + '/connect/authorize',
    scopes_supported: ['openid'],
    registration_endpoint: process.env.CORAL_AUTH_ROOT_URL + '/connect/authorize',
    subject_types_supported: ['public'],
    jwks_uri: process.env.CORAL_AUTH_ROOT_URL + '/connect/.well-known/jwks',
    response_types_supported: ['id_token token'],
    id_token_signing_alg_values_supported: [Token.alg]
  })
});

router.get('/.well-known/jwks', (req, res) => {
  res.json(Token.jwk);
});

//==============================================================================
// MIDWARE
//==============================================================================

// Verify that we have the needed pieces inside the session.
const verifyMidware = (req, res, next) => {
  let ar = util.AuthorizationRequest.unserialize(req.session);

  if (!ar.redirect_uri) {
    return next(new Error('redirect_uri is required'));
  }

  if (!ar.client_id) {
    return next(new Error('client_id is required'));
  }

  if (!ar.nonce) {
    return next(new Error('nonce is required'));
  }

  // Load the AuthorizationRequest onto the request object.
  req.ar = ar;

  next();
};

//==============================================================================
// STRATEGIES
//==============================================================================

// This will load in the passport strategies with the verifyMidware wrapped
// around it.
router.use(verifyMidware, require('./passport'));

module.exports = router;
