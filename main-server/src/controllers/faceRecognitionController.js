const EventImage = require("../models/EventImage");
const Event = require("../models/Event");
const RecognitionJob = require("../models/RecognitionJob");
const { getFaceRecognitionQueue } = require("../queues/faceRecognitionQueue");

const mongoose = require("mongoose");

exports.enqueueFaceRecognition = async (req, res) => {
    try {
        const faceRecognitionQueue = getFaceRecognitionQueue();
        const { eventId } = req.params;
        const force = String(req.query.force || "false").toLowerCase() === "true";

        //validate eventId is valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
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
        const jobId = `recognize-${eventId}`;
        const existingJob = await faceRecognitionQueue.getJob(jobId);

        if (existingJob && !force) {
            const currentState = await existingJob.getState();
            if (["waiting", "active", "delayed", "prioritized"].includes(currentState)) {
                return res.status(202).json({
                    message: "Recognition job already queued or running for this event.",
                    jobId,
                    status: currentState
                });
            }

            if (currentState === "completed") {
                return res.status(409).json({
                    message: "Recognition already completed for this event. Use ?force=true to run again.",
                    jobId,
                    status: currentState
                });
            }
        }

        if (existingJob && force) {
            await existingJob.remove();
        }

        await faceRecognitionQueue.add(
            "recognize-event",
            {
                eventId,
                societyId: String(event.societyId),
                requestedBy: String(req.user._id),
                imageUrls
            },
            { jobId }
        );

        await RecognitionJob.findOneAndUpdate(
            { jobId },
            {
                $set: {
                    eventId,
                    societyId: event.societyId,
                    requestedBy: req.user._id,
                    status: "queued",
                    progress: 0,
                    imageCount: imageUrls.length,
                    attemptsMade: 0,
                    error: null,
                    startedAt: null,
                    finishedAt: null,
                    resultSummary: {
                        imagesProcessed: 0,
                        totalFacesDetected: 0,
                        knownFacesFound: 0,
                        insertedMatches: 0
                    }
                }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.status(202).json({
            message: "Face recognition queued successfully.",
            jobId,
            eventId,
            imageCount: imageUrls.length
        });

    } catch (err) {
        console.error("Queueing face recognition failed:", err);
        return res.status(500).json({ message: "Unable to queue face recognition job.", error: err.message });
    }
};

exports.getFaceRecognitionJobStatus = async (req, res) => {
    try {
        const faceRecognitionQueue = getFaceRecognitionQueue();
        const { jobId } = req.params;

        const jobDoc = await RecognitionJob.findOne({ jobId }).lean();
        if (!jobDoc) {
            return res.status(404).json({ message: "Job not found." });
        }

        if (String(jobDoc.societyId) !== String(req.user.societyId)) {
            return res.status(403).json({ message: "Job not in your society." });
        }

        const queueJob = await faceRecognitionQueue.getJob(jobId);
        const queueState = queueJob ? await queueJob.getState() : null;
        const queueProgress = queueJob ? queueJob.progress : null;

        return res.status(200).json({
            jobId,
            eventId: jobDoc.eventId,
            status: jobDoc.status,
            progress: queueProgress ?? jobDoc.progress,
            attemptsMade: jobDoc.attemptsMade,
            imageCount: jobDoc.imageCount,
            resultSummary: jobDoc.resultSummary,
            error: jobDoc.error,
            startedAt: jobDoc.startedAt,
            finishedAt: jobDoc.finishedAt,
            queueState
        });
    } catch (err) {
        console.error("Fetching face recognition job status failed:", err);
        return res.status(500).json({ message: "Unable to fetch job status.", error: err.message });
    }
};

exports.listFaceRecognitionJobs = async (req, res) => {
    try {
        const query = { societyId: req.user.societyId };

        if (req.query.eventId && mongoose.Types.ObjectId.isValid(req.query.eventId)) {
            query.eventId = req.query.eventId;
        }

        const jobs = await RecognitionJob.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(req.query.limit || 20))
            .lean();

        return res.status(200).json({ count: jobs.length, jobs });
    } catch (err) {
        console.error("Listing face recognition jobs failed:", err);
        return res.status(500).json({ message: "Unable to list jobs.", error: err.message });
    }
};

exports.getFaceRecognitionQueueMetrics = async (req, res) => {
    try {
        const faceRecognitionQueue = getFaceRecognitionQueue();
        const counts = await faceRecognitionQueue.getJobCounts(
            "waiting",
            "active",
            "completed",
            "failed",
            "delayed",
            "paused"
        );

        const waitingThreshold = Number(process.env.FACE_RECOGNITION_WAITING_ALERT_THRESHOLD || 20);
        const failedThreshold = Number(process.env.FACE_RECOGNITION_FAILED_ALERT_THRESHOLD || 5);

        const alerts = {
            backlogHigh: (counts.waiting || 0) >= waitingThreshold,
            failureSpike: (counts.failed || 0) >= failedThreshold
        };

        return res.status(200).json({
            queue: "face-recognition",
            counts,
            alerts,
            thresholds: {
                waitingThreshold,
                failedThreshold
            }
        });

    } catch (err) {
        console.error("Fetching queue metrics failed:", err);
        return res.status(500).json({ message: "Unable to fetch queue metrics.", error: err.message });
    }
};