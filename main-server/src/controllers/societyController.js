const Society = require("../models/Society");
const JoinRequest = require("../models/JoinRequest");
const User = require("../models/User");

exports.getMySociety = async (req, res) => {
  try {
    let societyId = req.user?.societyId;
    if (!societyId) {
      const user = await User.findById(req.userId).select("societyId");
      societyId = user?.societyId || null;
    }

    if (!societyId) {
      return res.status(404).json({ message: "No society assigned" });
    }

    const society = await Society.findById(societyId).select("name code admin members");
    if (!society) {
      return res.status(404).json({ message: "Society not found" });
    }

    return res.json({ society });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load society", error: err.message });
  }
};

exports.listJoinRequests = async (req, res) => {
  try {
    const requests = await JoinRequest.find({
      societyId: req.user.societyId,
      status: "pending"
    }).populate("userId", "name email");

    const payload = requests.map((request) => ({
      id: request._id,
      status: request.status,
      createdAt: request.createdAt,
      user: request.userId
        ? {
            id: request.userId._id,
            name: request.userId.name,
            email: request.userId.email
          }
        : null
    }));

    return res.json({ requests: payload });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load requests", error: err.message });
  }
};

exports.approveJoinRequest = async (req, res) => {
  try {
    const request = await JoinRequest.findOne({
      _id: req.params.requestId,
      societyId: req.user.societyId
    });

    if (!request) {
      return res.status(404).json({ message: "Join request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    request.status = "approved";
    await request.save();

    await User.updateOne(
      { _id: request.userId },
      { societyId: req.user.societyId, role: "member", status: "active" }
    );

    await Society.updateOne(
      { _id: req.user.societyId },
      { $addToSet: { members: request.userId } }
    );

    return res.json({ message: "User approved" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to approve request", error: err.message });
  }
};

exports.rejectJoinRequest = async (req, res) => {
  try {
    const request = await JoinRequest.findOne({
      _id: req.params.requestId,
      societyId: req.user.societyId
    });

    if (!request) {
      return res.status(404).json({ message: "Join request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    request.status = "rejected";
    await request.save();

    await User.updateOne(
      { _id: request.userId },
      { societyId: null, role: null, status: "rejected" }
    );

    await Society.updateOne(
      { _id: req.user.societyId },
      { $pull: { members: request.userId } }
    );

    return res.json({ message: "User rejected" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to reject request", error: err.message });
  }
};
