const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true
    },

    societyId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Society',
        required: true
    },

    status:{
        type: String,
        enum: ['processing','ready'],
        default: 'processing'
    },

    createdAt:{
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Event', EventSchema);