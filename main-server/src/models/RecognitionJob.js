const mongoose = require("mongoose");

const recognitionJobSchema = new mongoose.Schema({
    jobId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
        required: true,
        index: true
    },
    societyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Society",
        required: true,
        index: true
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    status: {
        type: String,
        enum: ["queued", "active", "completed", "failed"],
        default: "queued",
        index: true
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    attemptsMade: {
        type: Number,
        default: 0
    },
    imageCount: {
        type: Number,
        default: 0
    },
    resultSummary: {
        imagesProcessed: { type: Number, default: 0 },
        totalFacesDetected: { type: Number, default: 0 },
        knownFacesFound: { type: Number, default: 0 },
        insertedMatches: { type: Number, default: 0 }
    },
    error: {
        type: String,
        default: null
    },
    startedAt: {
        type: Date,
        default: null
    },
    finishedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model("RecognitionJob", recognitionJobSchema);
