const parse = require('parse-duration');
const jwt = require('jsonwebtoken');
const uuid = require('uuid');
const rs = require('jsrsasign');
const debug = require('debug')('coral-auth:token');

const TOKEN_EXPIRY_TIME = parse(process.env.CORAL_AUTH_TOKEN_EXPIRY_TIME) / 1000;

const privateKey = new Buffer(process.env.CORAL_AUTH_PRIVATE_KEY, 'base64').toString('ascii');
debug('Loaded CORAL_AUTH_PRIVATE_KEY');

const publicKey = new Buffer(process.env.CORAL_AUTH_PUBLIC_KEY, 'base64').toString('ascii');
debug('Loaded CORAL_AUTH_PUBLIC_KEY');

let key = rs.KEYUTIL.getKey(publicKey);
let jwk = rs.KEYUTIL.getJWKFromKey(key);

// add the use: sig to the key as per the openidconnect req.
jwk.use = 'sig';

const Token = {
  expiresIn: TOKEN_EXPIRY_TIME,
  jwk: {
    "keys": [jwk]
  },
  alg: 'ES384',
  createClaims: (client_id, user_id) => ({
    sub: user_id,
    aud: client_id
  }),
  sign: (payload, done) => {
    // Set the kid on the signed token.
    payload.kid = Token.jwk.keys[0].kid;

    return jwt.sign(payload, privateKey, {
      issuer: process.env.CORAL_AUTH_ROOT_URL + '/connect',
      algorithm: Token.alg,
      expiresIn: TOKEN_EXPIRY_TIME,
      jwtid: uuid.v4()
    }, done);
  },
  verify: (token, done) => {
    return jwt.verify(token, Token.secret, {
      algorithms: [Token.alg]
    }, done);
  }
};

module.exports = Token;
