const { Queue } = require("bullmq");
const { redisConnectionOptions } = require("../config/redis");

const FACE_RECOGNITION_QUEUE = process.env.FACE_RECOGNITION_QUEUE || "face-recognition";

const defaultJobOptions = {
    attempts: Number(process.env.FACE_RECOGNITION_JOB_ATTEMPTS || 3),
    backoff: {
        type: "exponential",
        delay: Number(process.env.FACE_RECOGNITION_BACKOFF_MS || 2000)
    },
    removeOnComplete: {
        age: Number(process.env.FACE_RECOGNITION_COMPLETE_TTL_SECONDS || 86400),
        count: Number(process.env.FACE_RECOGNITION_COMPLETE_KEEP_COUNT || 1000)
    },
    removeOnFail: {
        age: Number(process.env.FACE_RECOGNITION_FAIL_TTL_SECONDS || 604800),
        count: Number(process.env.FACE_RECOGNITION_FAIL_KEEP_COUNT || 2000)
    }
};

let faceRecognitionQueue = null;

function getFaceRecognitionQueue() {
    if (!faceRecognitionQueue) {
        faceRecognitionQueue = new Queue(FACE_RECOGNITION_QUEUE, {
            connection: redisConnectionOptions,
            defaultJobOptions
        });
    }

    return faceRecognitionQueue;
}

module.exports = {
    FACE_RECOGNITION_QUEUE,
    defaultJobOptions,
    getFaceRecognitionQueue
};
