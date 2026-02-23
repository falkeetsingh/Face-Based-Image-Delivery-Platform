const express = require('express');
const router = express.Router();
const { addEventImages, deleteEventImages } = require('../controllers/eventImageController');
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

router.delete(
	'/:eventId/images',
	authMiddleware,
	requireActiveMember,
	requireAdmin,
	deleteEventImages
);

module.exports = router;
