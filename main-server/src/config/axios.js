const axios = require('axios');

const faceServer = axios.create({
    baseURL: process.env.FACE_SERVER_URL,
    headers: process.env.INTERNAL_API_KEY
        ? { "x-internal-key": process.env.INTERNAL_API_KEY }
        : undefined
});

module.exports = faceServer;