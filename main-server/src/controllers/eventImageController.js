const EventImage = require("../models/EventImage");
const Event = require("../models/Event");
const { uploadMultipleBuffers } = require("../services/cloudinaryService");

exports.addEventImages = async (req, res) => {
  try {
    const { eventId } = req.params;
    const files = req.files || [];

    if (!files.length) {
      return res.status(400).json({ message: "No images uploaded." });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    // upload to cloudinary
    const imageUrls = await uploadMultipleBuffers(
      files,
      `events/${eventId}`
    );

    const imagesToInsert = imageUrls.map(url => ({
      eventId,
      imageUrl: url
    }));

    const insertedImages = await EventImage.insertMany(imagesToInsert, {
      ordered: false
    });

    return res.status(201).json({
      message: "Event images uploaded & stored",
      count: insertedImages.length,
      images: insertedImages
    });

  } catch (error) {
    console.error("Error in addEventImages:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};
