const mongoose = require('mongoose');

const EventImageSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    index: true
  },

  imageUrl: {
    type: String,
    required: true
  },

  processed: {
    type: Boolean,
    default: false
  },

  faceCount: {
    type: Number,
    default: 0
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('EventImage', EventImageSchema);
