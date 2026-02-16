const express = require("express");
const router = express.Router();
const { runFaceRecognition } = require("../controllers/faceRecognitionController");

router.post("/:eventId/recognize", runFaceRecognition);

module.exports = router;
