const mongoose = require('mongoose');

const EvewntSchema = new mongoose.Schema({
    eventId:{
        type: String,
        required: true,
        unique: true
    },

    societyId:{
        type: String,
        required: true
    },

    name:{
        type: String,
    },

    status:{
        type: String,
        enum: ['processing','ready'],
        default: 'processing'
    },

    createAt:{
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Event', EvewntSchema);