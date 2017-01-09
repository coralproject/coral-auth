const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');
const path = require('path');
const session = require('express-session');
const csurf = require('csurf');
const cors = require('express-cors');
const url = require('url');
const helmet = require('helmet');
const flash = require('connect-flash');
const passport = require('./passport');
const mongoose = require('./mongoose');
const MongoStore = require('connect-mongo')(session);

// Create a new ExpressJS server.
const app = express();

//==============================================================================
// APP CONFIG
//==============================================================================

app.use(logger('dev'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// If we are currently trusting the proxy, then trust the first proxy.
if (process.env.CORAL_AUTH_TRUST_PROXY === 'TRUE') {
  app.set('trust proxy', 1);
}

//==============================================================================
// STATIC FILES
//==============================================================================

// Serve up static files as a last resort.
app.use(express.static(path.join(__dirname, 'public')));

//==============================================================================
// APP MIDDLEWARE
//==============================================================================

const helmet_opts = {

  // Only disable the frameguard in the event that the environment variable
  // `CORAL_AUTH_DISABLE_FRAMEGUARD` is `TRUE`.
  frameguard: !(process.env.CORAL_AUTH_DISABLE_FRAMEGUARD === 'TRUE')
}

app.use(helmet(helmet_opts));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

//==============================================================================
// SESSION MIDDLEWARE
//==============================================================================

let session_opts = {
  secret: process.env.CORAL_AUTH_SESSION_SECRET,
  resave: true,
  httpOnly: true,
  rolling: true,
  saveUninitialized: true,
  cookie: {

    // 10 minutes for expiry.
    maxAge: 600000,

    // True when the root url is also SSL enabled.
    secure: process.env.CORAL_AUTH_ROOT_URL.indexOf('https') === 0
  },
  store: new MongoStore({

    // Use the already existing mongoose connection.
    mongooseConnection: mongoose.connection
  })
};

app.use(session(session_opts));

// Ensure that the session exists on the request.
app.use((req, res, next) => {
  if (!req.session) {
    return next(new Error('session not available'));
  }

  // Add the session expiry time onto the response locals.
  res.locals.sessionExpiry = req.session.cookie.maxAge;

  console.log(res.locals.sessionExpiry);

  next();
});

// Add flash in after the session has been verified.
app.use(flash());

// Add CSRF validation.
app.use(csurf());

//==============================================================================
// PASSPORT MIDDLEWARE
//==============================================================================

// Setup the PassportJS Middleware.
app.use(passport.initialize());
app.use(passport.session());

//==============================================================================
// STRATEGIES
//==============================================================================

// Walk over the allowed clients and only allow the XHR from those
// hosts/schemes.
const allowedOrigins = process.env.CORAL_AUTH_ALLOWED_CLIENTS.split(' ').filter((client, i) => {
  return i % 2 == 1;
}).map((client) => {
  let u = url.parse(client);

  u.pathname = '';

  return url.format(u);
});

// Allow CORS on only the well known route.
app.use('/connect/.well-known', cors({
  allowedOrigins: allowedOrigins,
  methods: ['GET']
}));

// CONNECT

const connect = require('./routes/connect');

app.use('/connect', connect);

// DEMO

if (process.env.CORAL_AUTH_ENABLE_DEMO === 'TRUE') {
  app.get('/demo', (req, res) => {
    res.render('demo', {
      env: process.env
    });
  });
}

//==============================================================================
// ERROR HANDLING
//==============================================================================

const ErrNotFound = new Error('Not Found');
ErrNotFound.status = 404;

// Catch 404 and forward to error handler.
app.use((req, res, next) => next(ErrNotFound));

// In the event an error has been triggered, and a session is active, kill the
// session immediatly.
app.use((err, req, res, next) => {
  // If the error coming through is a not found error, then we shouldn't kill
  // the session as it could just be a static asset error.
  if (err === ErrNotFound) {
    return next(err);
  }

  // At this point, we have gotten to this handler because there was an error
  // in the application code that is unrelated to a not found error, so we
  // should take the skiddish approach and log out the user and remove their
  // session just to be sure.

  if (req.session) {
    // Log the user out if there is a user still on the session.
    if (req.user) {
      req.logout();
    }

    // Destroy the session if there is one.
    return req.session.destroy((sessionErr) => {
      if (sessionErr) {
        return next(sessionErr)
      }

      // Forward the error onto the next handler.

      return next(err);
    });
  }

  // There was no session, so just forward the error onto the next handler.
  next(err);
});

// General error handler. Respond with the message and error if we have it while
// returning a status code that makes sense.
if (app.get('env') === 'development') {
  app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// Production error handler no stacktraces leaked to user.
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;
