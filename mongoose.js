const mongoose = require('mongoose');
const enabled = require('debug').enabled;

// Use native promises
mongoose.Promise = global.Promise;

mongoose.connect(process.env.MONGO_URL);

if (enabled('shelf-auth:db')) {
  mongoose.set('debug', true);
}

module.exports = mongoose;
