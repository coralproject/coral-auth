# shelf-auth

## Installation

Clone the repository, and generate certificates for it using the following
commands:

```bash
# generate your private key
openssl genrsa -des3 -out private.pem 2048

# generate your public key
openssl rsa -in private.pem -outform PEM -pubout -out public.pem
```

These files must be in the root directory of the project during runtime.

## Requirements

This service requires MongoDB.

## Configuration

- `TRUST_PROXY` set to `TRUE` in the event you are behind a proxy.
- `TOKEN_EXPIRY_TIME` set to the duration for the token expiry in a string
  format as described https://www.npmjs.com/package/parse-duration
- `SESSION_SECRET` set to the secret for the session keys for cookie signing.
- `ENABLE_DEMO` set to `TRUE` to enable the demo page viewable at `/demo`.
- `DEBUG` set to `shelf-auth*` to have debug logs printed during operation.
- `PRIVATE_KEY_PASS` set to the password of the private key file.
- `ALLOWED_CLIENTS` set to space separated tuples of client id and callback url.
- `MONGO_URL` set to the url in the `mongodb://...` format.
- `ROOT_URL` set to the root url of the installed application in the format:
  `<scheme>://<host>` without the path.
- `FACEBOOK_APP_ID` set to the value provided by the social provider.
- `FACEBOOK_APP_SECRET` set to the value provided by the social provider.
- `TWITTER_CONSUMER_KEY` set to the value provided by the social provider.
- `TWITTER_CONSUMER_SECRET` set to the value provided by the social provider.
- `GOOGLE_CLIENT_ID` set to the value provided by the social provider.
- `GOOGLE_CLIENT_SECRET` set to the value provided by the social provider.
