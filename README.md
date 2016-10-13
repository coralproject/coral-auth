# coral-auth

## Installation

Clone the repository, and generate certificates for it using the following
commands:

```bash
# generate your private key
CORAL_AUTH_PRIVATE_KEY=$(openssl ecparam -genkey -name secp384r1 -noout | openssl base64 -e | tr -d '\n')

# generate your public key
CORAL_AUTH_PUBLIC_KEY=$(echo $CORAL_AUTH_PRIVATE_KEY | openssl base64 -d -A | openssl ec -pubout | openssl base64 -e | tr -d '\n')
```

If you want to have these variables added to a .env file, use:

```bash
cat >> .env <<EOF

CORAL_AUTH_PRIVATE_KEY=$CORAL_AUTH_PRIVATE_KEY
CORAL_AUTH_PUBLIC_KEY=$CORAL_AUTH_PUBLIC_KEY
EOF
```

## Requirements

This service requires MongoDB. You will also require OpenSSL to generate your
certificates or be able to provide your ECSDA certificates in a PEM encoded
format.

## Configuration

All configuration variables when provided in the environment must be prefixed
with a `CORAL_AUTH_` prefix.

| Key | Description | Default | Required |
|-----|-------------|---------|----------|
| `PRIVATE_KEY` | ec private key base64 encoded | | Yes|
| `PUBLIC_KEY` | ec public key base64 encoded | | Yes|
| `PORT` | port number you want to run the app on. | | Yes |
| `TRUST_PROXY` | `TRUE` in the event you are behind a proxy. | FALSE | No |
| `TOKEN_EXPIRY_TIME` | duration for the token expiry in a string format as described https://www.npmjs.com/package/parse-duration | | Yes |
| `SESSION_SECRET` | secret for the session keys for cookie signing. | | Yes |
| `ENABLE_DEMO` | `TRUE` to enable the demo page viewable at `/demo`. | FALSE | No|
| `DEBUG` | `coral-auth*` to have debug logs printed during operation. | | No |
| `ALLOWED_CLIENTS` | space separated tuples of client id and callback url in the form like `clientID1 https://clientID1/callback/url clientID2 https://clientID2/callback/url` | | Yes |
| `MONGO_URL` | url in the `mongodb://...` format. | mongodb://localhost:27107 | Yes |
| `ROOT_URL` | root url of the installed application externally available in the format: `<scheme>://<host>` without the path. | | Yes |
| `FACEBOOK_APP_ID` | provided by the social provider. | | No |
| `FACEBOOK_APP_SECRET` | provided by the social provider. | | No |
| `TWITTER_CONSUMER_KEY` | provided by the social provider. | | No |
| `TWITTER_CONSUMER_SECRET` | provided by the social provider. | | No |
| `GOOGLE_CLIENT_ID` | provided by the social provider. | | No |
| `GOOGLE_CLIENT_SECRET` | provided by the social provider. | | No |

## Social Configuration

When configuring the social services, ensure you use the following format for
the callback url's:

```
{{ CORAL_AUTH_ROOT_URL }}/connect/{{ SOCIAL_PROVIDER }}/callback
```

Here's an example when `CORAL_AUTH_ROOT_URL = https://auth.coralproject.net` and
`SOCIAL_PROVIDER = facebook`:

```
https://auth.coralproject.net/connect/facebook/callback
```

Current supported social providers are:

- Facebook
- Google
- Twitter

Additional providers can be added by configuring the `passport.js` file to add
the passport strategy and adding callback's inside the `routes/connect.js`
file.

## Docker

To run this installation as a single deployment run it with docker-compose.

1. You must have generated the keys from above in the **Installation** section.
2. Specify configuration as indicated in the **Configuration** section except
  for the config `CORAL_AUTH_MONGO_URL` and `CORAL_AUTH_PORT` in a file called
  `.env` in the project root.
2. Create the deployment with `docker-compose up -d`.
3. Create a user with the cli inside the following shell `docker-compose run
  --rm auth bash`.
4. From that shell you can execute commands against the cli (See `cli --help`
  for help using the cli).
