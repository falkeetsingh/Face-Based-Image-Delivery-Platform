const express = require('express');
const router = express.Router();
const { addEventImages } = require('../controllers/eventImageController');
const upload = require('../middleware/upload');

router.post('/:eventId/images', upload.array("images"), addEventImages);

module.exports = router;
