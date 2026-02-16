const mongoose = require('mongoose');

async function connectDB(){
    const uri = process.env.MONGODB_URI;

    if(!uri){
        throw new Error('MONGODB_URI not set in environment variables');
    }

    await mongoose.connect(uri, {
        dbName: 'face-server'
    });

    console.log('Connected to Database');
}

module.exports = connectDB;