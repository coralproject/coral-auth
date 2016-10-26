const url = require('url');
const querystring = require('querystring');

/**
 * Validates the request_uri parameter to ensure that it is allowed to talk to
 * us with the matching client_id.
 *
 * @param {String} client_id - the client_id to check against
 * @param {String} uri       - the uri to check if it matches our callback param
 */
const ValidateClient = function(client_id, uri) {
  let clients = process.env.CORAL_AUTH_ALLOWED_CLIENTS.split(' ');

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

/**
 * Validates that the nonce is valid.
 * @param {String} nonce nonce token
 */
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

const AddObjectToQuery = function(uri, obj) {
  let u = url.parse(uri, true);

  u.search = querystring.stringify(obj);

  return url.format(u);
}

const AuthorizationRequest = {};

AuthorizationRequest.validate = function(ar, next) {
  // Check the redirect_uri parameter that was provided.
  let client_id = ar.client_id;

  if (!client_id) {
    return next(new Error('client_id is required'));
  }

  let redirect_uri = ar.redirect_uri;

  // redirect_uri is required as per https://openid.net/specs/openid-connect-core-1_0.html#ImplicitAuthRequest
  if (!redirect_uri) {
    return next(new Error('redirect_uri is required'));
  }

  if (!ValidateClient(client_id, redirect_uri)) {
    return next(new Error('invalid redirect_uri param'));
  }

  let nonce = ar.nonce;

  // nonce is required as per https://openid.net/specs/openid-connect-core-1_0.html#ImplicitAuthRequest
  if (!nonce) {
    return next(new Error('nonce is required'));
  } else if (!ValidateNonce(nonce)) {
    return next(new Error('invalid nonce token param'));
  }

  let state = ar.state;

  let response_type = ar.response_type;

  if (response_type !== 'id_token token') {
    return next(new Error('unsupported response_type param'));
  }

  let scope = ar.scope;

  if (scope !== 'openid') {
    return next(new Error('unsupported scope param'));
  }

  let display = ar.display;

  next(null, {
    display,
    scope,
    client_id,
    redirect_uri,
    response_type,
    nonce,
    state
  });
};

AuthorizationRequest.serialize = function(session, ar) {
  session.auth_request = ar;
};

AuthorizationRequest.unserialize = function(session) {
  return session.auth_request;
};

module.exports = {};
module.exports.AddObjectToHash = AddObjectToHash;
module.exports.AddObjectToQuery = AddObjectToQuery;
module.exports.AuthorizationRequest = AuthorizationRequest;
