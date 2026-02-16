const mongoose = require("mongoose");

const faceMatchSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
        required: true,
        index: true
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    imageUrl: {
        type: String,
        required: true
    },

    distance: {
        type: Number,
        required: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

// prevent duplicate inserts on re-run
faceMatchSchema.index(
    { eventId: 1, userId: 1, imageUrl: 1 },
    { unique: true }
);

module.exports = mongoose.model("FaceMatch", faceMatchSchema);
