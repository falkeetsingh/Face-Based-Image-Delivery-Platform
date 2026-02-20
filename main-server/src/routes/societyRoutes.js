const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireActiveMember, requireAdmin } = require("../middleware/roleMiddleware");
const societyController = require("../controllers/societyController");

const router = express.Router();

router.get("/me", authMiddleware, societyController.getMySociety);
router.get("/requests", authMiddleware, requireActiveMember, requireAdmin, societyController.listJoinRequests);
router.post(
  "/requests/:requestId/approve",
  authMiddleware,
  requireActiveMember,
  requireAdmin,
  societyController.approveJoinRequest
);
router.post(
  "/requests/:requestId/reject",
  authMiddleware,
  requireActiveMember,
  requireAdmin,
  societyController.rejectJoinRequest
);

module.exports = router;
