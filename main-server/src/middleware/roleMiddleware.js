const User = require("../models/User");

const requireActiveMember = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.societyId) {
      return res.status(403).json({ message: "No society membership" });
    }

    if (user.status !== "active") {
      return res.status(403).json({ message: "Membership not active" });
    }

    req.user = user;
    return next();
  } catch (err) {
    return res.status(500).json({ message: "Failed to load user", error: err.message });
  }
};

const requireAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(500).json({ message: "User context missing" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }

  return next();
};

module.exports = {
  requireActiveMember,
  requireAdmin
};
