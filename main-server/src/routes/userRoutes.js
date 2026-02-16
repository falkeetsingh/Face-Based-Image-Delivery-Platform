const express = require("express");
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

const router = express.Router();

// Public routes
router.post("/register", upload.single("image"), authController.register);
router.post("/login", authController.login);

// Protected routes
router.get("/profile", authMiddleware, authController.getProfile);
router.get("/me/matches", authMiddleware, authController.getMyMatches);
router.post("/logout", authMiddleware, authController.logout);

module.exports = router;
