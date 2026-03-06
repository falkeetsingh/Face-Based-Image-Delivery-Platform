const { Worker } = require("bullmq");
const mongoose = require("mongoose");
const { redisConnectionOptions } = require("../config/redis");
const { FACE_RECOGNITION_QUEUE } = require("../queues/faceRecognitionQueue");
const faceServer = require("../config/axios");
const User = require("../models/User");
const FaceMatch = require("../models/FaceMatch");
const RecognitionJob = require("../models/RecognitionJob");

const workerConcurrency = Number(process.env.FACE_RECOGNITION_WORKER_CONCURRENCY || 1);

function logJob(jobId, step, details) {
    const base = `[face-worker][${new Date().toISOString()}][job:${jobId}] ${step}`;
    if (details !== undefined) {
        console.log(base, details);
        return;
    }
    console.log(base);
}

async function processRecognitionJob(job) {
    const { eventId, societyId, imageUrls } = job.data;
    logJob(job.id, "START", {
        eventId,
        societyId,
        imageCount: Array.isArray(imageUrls) ? imageUrls.length : 0,
        attempt: job.attemptsMade + 1
    });

    await RecognitionJob.findOneAndUpdate(
        { jobId: job.id },
        {
            $set: {
                status: "active",
                progress: 10,
                startedAt: new Date(),
                error: null
            },
            $inc: { attemptsMade: 1 }
        }
    );
    logJob(job.id, "DB_STATUS_UPDATED", { status: "active", progress: 10 });

    await job.updateProgress(10);
    logJob(job.id, "PROGRESS", 10);

    const eligibleUsers = await User.find({
        status: "active",
        societyId: new mongoose.Types.ObjectId(societyId),
        faceProfileId: { $exists: true, $nin: [null, ""] }
    })
        .select("_id faceProfileId")
        .lean();

    if (!eligibleUsers.length) {
        throw new Error("No active users with registered faces found for this society.");
    }

    const candidateUserIds = eligibleUsers.map(user => String(user.faceProfileId));
    const userByFaceProfileId = new Map(
        eligibleUsers.map(user => [String(user.faceProfileId), user])
    );

    logJob(job.id, "ELIGIBLE_USERS_RESOLVED", {
        eligibleUsers: eligibleUsers.length,
        societyId
    });

    logJob(job.id, "FACE_SERVER_REQUEST", { endpoint: "/api/events/recognize", eventId });

    const { data } = await faceServer.post("/api/events/recognize", {
        eventId,
        imageUrls,
        candidateUserIds
    });

    logJob(job.id, "FACE_SERVER_RESPONSE", {
        imagesProcessed: data?.imagesProcessed || 0,
        totalFacesDetected: data?.totalFacesDetected || 0,
        matchedUsers: (data?.matchedUsers || []).length
    });

    await job.updateProgress(65);
    logJob(job.id, "PROGRESS", 65);

    const matchedUsers = data?.matchedUsers || [];
    const faceProfileIds = [...new Set(matchedUsers.map(match => match.userId).filter(Boolean))];
    logJob(job.id, "MATCHES_FILTERED", {
        totalMatchedUsers: matchedUsers.length,
        uniqueFaceProfiles: faceProfileIds.length
    });

    const operations = [];
    for (const match of matchedUsers) {
        const matchedUser = userByFaceProfileId.get(String(match.userId));
        if (!matchedUser) {
            continue;
        }

        operations.push({
            updateOne: {
                filter: {
                    eventId: new mongoose.Types.ObjectId(eventId),
                    userId: matchedUser._id,
                    imageUrl: match.imageUrl
                },
                update: {
                    $setOnInsert: {
                        eventId: new mongoose.Types.ObjectId(eventId),
                        userId: matchedUser._id,
                        imageUrl: match.imageUrl,
                        distance: match.distance
                    }
                },
                upsert: true
            }
        });
    }
    logJob(job.id, "DB_OPERATIONS_PREPARED", { operations: operations.length });

    let upsertedCount = 0;
    if (operations.length > 0) {
        const bulkWriteResult = await FaceMatch.bulkWrite(operations, { ordered: false });
        upsertedCount = bulkWriteResult.upsertedCount || 0;
        logJob(job.id, "DB_BULK_WRITE_DONE", {
            upsertedCount,
            matchedCount: bulkWriteResult.matchedCount || 0,
            modifiedCount: bulkWriteResult.modifiedCount || 0
        });
    } else {
        logJob(job.id, "DB_BULK_WRITE_SKIPPED", "No operations to write");
    }

    await job.updateProgress(100);
    logJob(job.id, "PROGRESS", 100);

    const summary = {
        imagesProcessed: data?.imagesProcessed || 0,
        totalFacesDetected: data?.totalFacesDetected || 0,
        knownFacesFound: matchedUsers.length,
        insertedMatches: upsertedCount
    };

    await RecognitionJob.findOneAndUpdate(
        { jobId: job.id },
        {
            $set: {
                status: "completed",
                progress: 100,
                resultSummary: summary,
                finishedAt: new Date(),
                error: null
            }
        }
    );
    logJob(job.id, "COMPLETE", summary);

    return summary;
}

function createFaceRecognitionWorker() {
    const worker = new Worker(
        FACE_RECOGNITION_QUEUE,
        processRecognitionJob,
        {
            connection: redisConnectionOptions,
            concurrency: workerConcurrency,
            lockDuration: Number(process.env.FACE_RECOGNITION_LOCK_MS || 300000)
        }
    );

    worker.on("completed", (job, result) => {
        logJob(job.id, "EVENT_COMPLETED", result);
    });

    worker.on("active", (job, prev) => {
        logJob(job.id, "EVENT_ACTIVE", { previousState: prev, attemptsMade: job.attemptsMade });
    });

    worker.on("failed", async (job, err) => {
        console.error(`[face-worker][${new Date().toISOString()}][job:${job?.id}] EVENT_FAILED`, {
            error: err.message,
            stack: err.stack
        });
        if (!job) {
            return;
        }

        await RecognitionJob.findOneAndUpdate(
            { jobId: job.id },
            {
                $set: {
                    status: "failed",
                    progress: Number(job.progress || 0),
                    finishedAt: new Date(),
                    error: err.message
                }
            }
        );

        logJob(job.id, "FAILED_STATUS_SAVED", {
            progress: Number(job.progress || 0),
            attemptsMade: job.attemptsMade
        });
    });

    worker.on("stalled", (jobId, prev) => {
        console.warn(`[face-worker][${new Date().toISOString()}][job:${jobId}] EVENT_STALLED`, {
            previousState: prev
        });
    });

    worker.on("ready", () => {
        console.log(`[face-worker][${new Date().toISOString()}] WORKER_READY`, {
            queue: FACE_RECOGNITION_QUEUE,
            concurrency: workerConcurrency
        });
    });

    worker.on("closing", (msg) => {
        console.log(`[face-worker][${new Date().toISOString()}] WORKER_CLOSING`, msg);
    });

    worker.on("closed", () => {
        console.log(`[face-worker][${new Date().toISOString()}] WORKER_CLOSED`);
    });

    worker.on("error", (err) => {
        console.error(`[face-worker][${new Date().toISOString()}] WORKER_ERROR`, err);
    });

    return worker;
}

module.exports = {
    createFaceRecognitionWorker
};
