const express = require("express");
const router = express.Router();
const {
	enqueueFaceRecognition,
	getFaceRecognitionJobStatus,
	listFaceRecognitionJobs,
	getFaceRecognitionQueueMetrics
} = require("../controllers/faceRecognitionController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireActiveMember, requireAdmin } = require("../middleware/roleMiddleware");

router.get(
	"/recognition/jobs",
	authMiddleware,
	requireActiveMember,
	requireAdmin,
	listFaceRecognitionJobs
);

router.get(
	"/recognition/jobs/:jobId",
	authMiddleware,
	requireActiveMember,
	requireAdmin,
	getFaceRecognitionJobStatus
);

router.get(
	"/recognition/metrics",
	authMiddleware,
	requireActiveMember,
	requireAdmin,
	getFaceRecognitionQueueMetrics
);

router.post(
	"/:eventId/recognize",
	authMiddleware,
	requireActiveMember,
	requireAdmin,
	enqueueFaceRecognition
);

module.exports = router;
