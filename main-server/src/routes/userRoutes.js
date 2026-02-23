const express = require("express");
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const { requireActiveMember } = require("../middleware/roleMiddleware");
const { authRateLimiter } = require("../middleware/securityMiddleware");

const router = express.Router();

// Public routes
router.post("/register", authRateLimiter, upload.single("image"), authController.register);
router.post("/login", authRateLimiter, authController.login);

// Protected routes
router.get("/profile", authMiddleware, authController.getProfile);
router.get("/me/matches", authMiddleware, requireActiveMember, authController.getMyMatches);
router.post("/logout", authMiddleware, authController.logout);

module.exports = router;
