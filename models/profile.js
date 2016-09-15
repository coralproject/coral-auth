const Schema = require('../mongoose').Schema;

const ProfileSchema = new Schema({
  id: String,
  provider: String
}, {
  _id: false
});

module.exports.Schema = ProfileSchema;
