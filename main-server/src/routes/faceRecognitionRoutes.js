const express = require("express");
const router = express.Router();
const { runFaceRecognition } = require("../controllers/faceRecognitionController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireActiveMember, requireAdmin } = require("../middleware/roleMiddleware");

router.post(
	"/:eventId/recognize",
	authMiddleware,
	requireActiveMember,
	requireAdmin,
	runFaceRecognition
);

module.exports = router;
