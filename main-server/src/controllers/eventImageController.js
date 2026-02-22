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

    if (!event.societyId.equals(req.user.societyId)) {
      return res.status(403).json({ message: "Event not in your society." });
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

exports.deleteEventImages = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { imageIds } = req.body;

    if (!imageIds || !imageIds.length) {
      return res.status(400).json({ message: "No images provided for deletion." });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    if (!event.societyId.equals(req.user.societyId)) {
      return res.status(403).json({ message: "Event not in your society." });
    }

    const { default: mongoose } = await import('mongoose');
    const objectIds = imageIds.map(id => new mongoose.Types.ObjectId(id));

    // Get the images so we can delete their facematch links later
    const FaceMatch = require("../models/FaceMatch");
    const imagesToDelete = await EventImage.find({ _id: { $in: objectIds }, eventId });
    const imageUrls = imagesToDelete.map(img => img.imageUrl);

    // Perform database wipe
    await EventImage.deleteMany({ _id: { $in: objectIds }, eventId });
    await FaceMatch.deleteMany({ eventId, imageUrl: { $in: imageUrls } });

    // Note: To completely wipe images from Cloudinary storage, their public IDs would be needed. 
    // This removes them from the application database context successfully.

    return res.status(200).json({ message: "Images successfully deleted.", count: imageUrls.length });
  } catch (error) {
    console.error("Error in deleteEventImages:", error);
    return res.status(500).json({ message: "Internal server error while executing deletions." });
  }
};
