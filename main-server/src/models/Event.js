const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    default: null
  },
  description: {
    type: String,
    trim: true,
    default: ""
  },
  societyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Society"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Event", EventSchema);
