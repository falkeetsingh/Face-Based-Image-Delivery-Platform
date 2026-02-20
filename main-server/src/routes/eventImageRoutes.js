const express = require('express');
const router = express.Router();
const { addEventImages } = require('../controllers/eventImageController');
const upload = require('../middleware/upload');
const authMiddleware = require("../middleware/authMiddleware");
const { requireActiveMember, requireAdmin } = require("../middleware/roleMiddleware");

router.post(
	'/:eventId/images',
	authMiddleware,
	requireActiveMember,
	requireAdmin,
	upload.array("images"),
	addEventImages
);

module.exports = router;
