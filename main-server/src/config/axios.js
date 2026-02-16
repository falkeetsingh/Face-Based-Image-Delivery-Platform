const axios = require('axios');

const faceServer = axios.create({

    baseURL: process.env.FACE_SERVER_URL
});

module.exports = faceServer;