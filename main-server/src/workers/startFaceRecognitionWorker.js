require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const { createFaceRecognitionWorker } = require("./faceRecognitionWorker");

async function startFaceRecognitionWorker() {
    await connectDB();

    const worker = createFaceRecognitionWorker();

    console.log("Face recognition worker started");

    const shutdown = async () => {
        console.log("Shutting down face recognition worker...");
        await worker.close();
        await mongoose.disconnect();
        process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

startFaceRecognitionWorker().catch((err) => {
    console.error("Failed to start face recognition worker:", err);
    process.exit(1);
});
