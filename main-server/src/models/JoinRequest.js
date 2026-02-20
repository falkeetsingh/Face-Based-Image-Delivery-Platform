const mongoose = require("mongoose");

const joinRequestSchema = new mongoose.Schema({
  societyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Society",
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

joinRequestSchema.index({ societyId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("JoinRequest", joinRequestSchema);
