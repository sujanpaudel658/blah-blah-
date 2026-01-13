// Hotel model example
const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema({
  name: String,
  location: String,
  rooms: Number
});

module.exports = mongoose.model('Hotel', hotelSchema);