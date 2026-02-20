const Event = require("../models/Event");
const EventImage = require("../models/EventImage");
const FaceMatch = require("../models/FaceMatch");
const mongoose = require("mongoose");

exports.createEvent = async (req, res) => {
  const { name, date, description } = req.body;
  const societyId = req.user?.societyId || req.body.societyId;

  if (!name || !societyId) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  if (!mongoose.Types.ObjectId.isValid(societyId)) {
    return res.status(400).json({ message: "Invalid societyId." });
  }

  try {
    const event = await Event.create({
      name,
      date: date ? new Date(date) : null,
      description: description || "",
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

exports.listSocietyEvents = async (req, res) => {
  try {
    const events = await Event.find({ societyId: req.user.societyId }).sort({ createdAt: -1 });
    res.json({ events });
  } catch (err) {
    console.error("List events failed:", err);
    res.status(500).json({ message: "Failed to load events." });
  }
};

exports.getEventDetails = async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "Invalid eventId." });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    if (!event.societyId.equals(req.user.societyId)) {
      return res.status(403).json({ message: "Event not in your society." });
    }

    const images = req.user.role === "admin"
      ? await EventImage.find({ eventId }).sort({ createdAt: -1 })
      : [];

    let matchesQuery = { eventId };
    if (req.user.role !== "admin") {
      matchesQuery = { eventId, userId: req.user._id };
    }

    const matches = await FaceMatch.find(matchesQuery)
      .sort({ createdAt: -1 })
      .populate("userId", "name email");

    const payloadMatches = matches.map(match => ({
      id: match._id,
      user: match.userId
        ? { id: match.userId._id, name: match.userId.name, email: match.userId.email }
        : null,
      imageUrl: match.imageUrl,
      distance: match.distance,
      createdAt: match.createdAt
    }));

    res.json({
      event,
      images,
      matches: payloadMatches
    });
  } catch (err) {
    console.error("Get event details failed:", err);
    res.status(500).json({ message: "Failed to load event details." });
  }
};
