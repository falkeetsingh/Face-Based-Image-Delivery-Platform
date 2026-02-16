const mongoose = require('mongoose');

const eventImageSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
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
  }
}, { timestamps: true });

eventImageSchema.index({ eventId: 1, imageUrl: 1 }, { unique: true });

module.exports = mongoose.model('EventImage', eventImageSchema);
