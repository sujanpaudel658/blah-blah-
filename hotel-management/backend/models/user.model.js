// User model example
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: { type: String, enum: ['superadmin', 'admin', 'guest'], default: 'guest' }
});

module.exports = mongoose.model('User', userSchema);