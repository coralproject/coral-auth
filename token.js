const parse = require('parse-duration');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const uuid = require('uuid');

const TOKEN_EXPIRY_TIME = parse(process.env.TOKEN_EXPIRY_TIME) / 1000;

const Token = {
  secret: {
    key: fs.readFileSync('keys/private.pem')
  },
  createClaims: (user_id, scopes, nonce) => ({
    sub: user_id,
    scopes: scopes || [],
    nonce: nonce
  }),
  sign: (payload, done) => {
    return jwt.sign(payload, Token.secret, {
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

module.exports = Token;
