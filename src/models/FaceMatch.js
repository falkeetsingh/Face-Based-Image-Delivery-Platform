const mongoose = require('mongoose');

const FaceMatchSchema = new mongoose.Schema({
  eventId: {
    type: String,
    index: true
  },

  imageUrl: {
    type: String,
    required: true
  },

  userId: {
    type: String,
    index: true
  },

  faceIndex: Number,

  distance: Number,

  createdAt: {
    type: Date,
    default: Date.now
  }
});

FaceMatchSchema.index({ eventId: 1, userId: 1 });

module.exports = mongoose.model('FaceMatch', FaceMatchSchema);
