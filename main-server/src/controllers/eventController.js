const Event = require("../models/Event");
const mongoose = require("mongoose");

exports.createEvent = async (req, res) => {
  const { name, societyId } = req.body;

  if (!name || !societyId) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  if (!mongoose.Types.ObjectId.isValid(societyId)) {
    return res.status(400).json({ message: "Invalid societyId." });
  }

  try {
    const event = await Event.create({
      name,
      societyId
    });

    res.status(201).json({
      message: "Event created successfully",
      event
    });
  } catch (err) {
    console.error("Create event failed:", err);
    res.status(500).json({ message: "Failed to create event." });
  }
};
