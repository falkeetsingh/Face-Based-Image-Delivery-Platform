const mongoose =require('mongoose');

const UserSchema = new mongoose.Schema({
    userId:{
        type: String,
        required: true,
        unique: true
    },

    faceDescriptors:{
        type:[[Number]], // array of arrays of numbers
        required: true
    },

    createdAt:{
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', UserSchema);