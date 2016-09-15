const parse = require('parse-duration');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const uuid = require('uuid');

const TOKEN_EXPIRY_TIME = parse(process.env.TOKEN_EXPIRY_TIME) / 1000;

const Token = {
  secret: {
    key: fs.readFileSync('private.pem'),
    passphrase: process.env.PRIVATE_KEY_PASS
  },
  sign: (payload, done) => {
    return jwt.sign(payload, Token.secret, {
      algorithm: 'RS256',
      expiresIn: TOKEN_EXPIRY_TIME,
      jwtid: uuid.v4(),
      notBefore: "1 minute"
    }, done);
  },
  verify: (token, done) => {
    return jwt.verify(token, Token.secret, {
      algorithms: ['RS256']
    }, done);
  }
};

module.exports = Token;
