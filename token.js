const parse = require('parse-duration');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const uuid = require('uuid');
const jose = require('node-jose');
const debug = require('debug')('coral-auth:token');

const TOKEN_EXPIRY_TIME = parse(process.env.TOKEN_EXPIRY_TIME) / 1000;

const privateKey = fs.readFileSync('keys/private.pem', 'ascii');
debug('Loaded keys/private.pem');

const publicKey = fs.readFileSync('keys/public.pem', 'ascii');
debug('Loaded keys/public.pem');

const Token = {
  secret: {
    key: privateKey
  },
  jwk: null,
  createClaims: (user_id, scopes, nonce) => ({
    sub: user_id,
    scopes: scopes || [],
    nonce: nonce
  }),
  sign: (payload, done) => {
    // Set the kid on the signed token.
    payload.kid = Token.jwk.keys[0].kid;

    return jwt.sign(payload, Token.secret, {
      issuer: process.env.ROOT_URL + '/connect',
      algorithm: 'ES512',
      expiresIn: TOKEN_EXPIRY_TIME,
      jwtid: uuid.v4(),
      notBefore: "1 minute"
    }, done);
  },
  verify: (token, done) => {
    return jwt.verify(token, Token.secret, {
      algorithms: ['ES512']
    }, done);
  }
};

// Load the public key into the keystore so we can use it to create our jwk.
jose.JWK.asKey(publicKey, 'pem').then((result) => {

  // Load the keystore JSON into our object.
  let jwk = result.keystore.toJSON();

  // Add the use param for the key.
  jwk.keys = jwk.keys.map((key) => {
    key.use = 'sig';

    return key;
  });

  // Add the jwk for the token.
  Token.jwk = jwk;

  debug('Keystore has been populated');
}).catch((err) => {

  // We couldn't load the publicKey into the keystore.
  console.error(err);

  // This is bad, so we should just exit at this point.
  process.exit(1);
});

module.exports = Token;
