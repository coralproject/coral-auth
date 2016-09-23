# shelf-auth

## Installation

Clone the repository, and generate certificates for it using the following
commands:

```bash
# generate your private key
openssl genrsa -des3 -out keys/private.pem 2048

# generate your public key
openssl rsa -in keys/private.pem -outform PEM -pubout -out keys/public.pem
```

These files must be in the root directory of the project during runtime.

## Requirements

This service requires MongoDB. You will also require OpenSSL to generate your
certificates or be able to provide your RSA certificates in a PEM encoded
format.

## Configuration

- `PORT` set to the port number you want to run the app on.
- `TRUST_PROXY` set to `TRUE` in the event you are behind a proxy.
- `TOKEN_EXPIRY_TIME` set to the duration for the token expiry in a string
  format as described https://www.npmjs.com/package/parse-duration
- `SESSION_SECRET` set to the secret for the session keys for cookie signing.
- `ENABLE_DEMO` set to `TRUE` to enable the demo page viewable at `/demo`.
- `DEBUG` set to `shelf-auth*` to have debug logs printed during operation.
- `PRIVATE_KEY_PASS` set to the password of the private key file.
- `ALLOWED_CLIENTS` set to space separated tuples of client id and callback url
  in the form like `clientID1 https://clientID1/callback/url clientID2 https://clientID2/callback/url`
- `MONGO_URL` set to the url in the `mongodb://...` format.
- `ROOT_URL` set to the root url of the installed application in the format:
  `<scheme>://<host>` without the path.
- `FACEBOOK_APP_ID` set to the value provided by the social provider.
- `FACEBOOK_APP_SECRET` set to the value provided by the social provider.
- `TWITTER_CONSUMER_KEY` set to the value provided by the social provider.
- `TWITTER_CONSUMER_SECRET` set to the value provided by the social provider.
- `GOOGLE_CLIENT_ID` set to the value provided by the social provider.
- `GOOGLE_CLIENT_SECRET` set to the value provided by the social provider.

## Docker

To run this installation as a single deployment run it with docker-compose.

1. You must have generated the keys from above in the **Installation** section.
2. Specify configuration as indicated in the **Configuration** section except
  for the config `MONGO_URL` and `PORT` in a file called `.env` in the project
  root.
2. Create the deployment with `docker-compose up -d`.
3. Create a user with the cli inside the following shell `docker-compose run
  --rm auth bash`.
4. From that shell you can execute commands against the cli (See `cli --help`
  for help using the cli).
