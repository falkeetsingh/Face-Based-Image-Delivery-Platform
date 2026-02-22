const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireActiveMember, requireAdmin } = require("../middleware/roleMiddleware");
const {
  createEvent,
  listSocietyEvents,
  getEventDetails,
  deleteEvent
} = require("../controllers/eventController");

const router = express.Router();

router.get("/", authMiddleware, requireActiveMember, listSocietyEvents);
router.post("/", authMiddleware, requireActiveMember, requireAdmin, createEvent);
router.get("/:eventId", authMiddleware, requireActiveMember, getEventDetails);
router.delete("/:eventId", authMiddleware, requireActiveMember, requireAdmin, deleteEvent);

module.exports = router;
