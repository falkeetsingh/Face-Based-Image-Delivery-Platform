const EventImage = require("../models/EventImage");
const FaceMatch = require("../models/FaceMatch");
const User = require("../models/User");
const Event = require("../models/Event");
const faceServer = require("../config/axios");

exports.runFaceRecognition = async (req, res) => {
    try {
        const { eventId } = req.params;

        //validate eventId is valid ObjectId
        if (!require("mongoose").Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ message: "Invalid eventId format." });
        }

        //get image urls for event
        const eventImages = await EventImage.find({ eventId });

        if (!eventImages || eventImages.length === 0) {
            return res.status(404).json({ message: "No images found for this event." });
        }

        // Verify event exists
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found." });
        }

        if (!event.societyId.equals(req.user.societyId)) {
            return res.status(403).json({ message: "Event not in your society." });
        }

        const imageUrls = eventImages.map(img => img.imageUrl);

        //call face recognition server
        const { data } = await faceServer.post("/api/events/recognize", {
            eventId,
            imageUrls
        });

        const { matchedUsers } = data;

        if (!matchedUsers || matchedUsers.length === 0) {
            return res.status(200).json({ message: "No faces recognized in this event.", matches: [] });
        }

        //Convert matched userIds from face server to main server user records
        const inserts = [];
        for (const match of matchedUsers) {
            // Find user by faceProfileId (which is the userId from face server)
            const user = await User.findOne({ faceProfileId: match.userId });

            if (user && user.status === "active" && user.societyId?.equals(event.societyId)) {
                inserts.push({
                    eventId: eventId,
                    userId: user._id,
                    imageUrl: match.imageUrl,
                    distance: match.distance
                });
            } else {
                console.warn(`User with faceProfileId "${match.userId}" not eligible for event ${eventId}`);
            }
        }

        //store matches in FaceMatch collection
        if (inserts.length > 0) {
            await FaceMatch.insertMany(inserts, { ordered: false }).catch(err => {
                if (err.code === 11000) {
                    console.log("Some duplicate face matches were skipped");
                } else {
                    throw err;
                }
            });

            return res.status(200).json({
                message: "Face recognition completed",
                matches: inserts.length,
                details: matchedUsers
            });
        } else {
            return res.status(200).json({ message: "No matching users found in the system.", matches: [] });
        }
    } catch (err) {
        console.error("Face recognition failed:", err);
        return res.status(500).json({ message: "Face recognition process failed.", error: err.message });
    }
}