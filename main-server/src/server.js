require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const { generalRateLimiter, secureHeaders } = require("./middleware/securityMiddleware");
const { createFaceRecognitionWorker } = require("./workers/faceRecognitionWorker");

const app = express();

const normalizeOrigin = (url) => (url || "").trim().replace(/\/+$/, "");

const allowedOrigins = String(process.env.CLIENT_URL || "http://localhost:5173")
	.split(",")
	.map((origin) => normalizeOrigin(origin))
	.filter(Boolean);

const corsOptions = {
	origin: (origin, callback) => {
		// Allow non-browser requests (health checks, server-to-server).
		if (!origin) {
			return callback(null, true);
		}

		const normalizedRequestOrigin = normalizeOrigin(origin);
		if (allowedOrigins.includes(normalizedRequestOrigin)) {
			return callback(null, true);
		}

		return callback(new Error(`CORS blocked for origin: ${origin}`));
	},
	credentials: true
};

app.use(cors(corsOptions));
app.disable("x-powered-by");
app.use(secureHeaders);
app.use(generalRateLimiter);
app.use(express.json());
app.use(cookieParser());

app.get('/health', (req, res) => {
	res.json({ ok: true });
});

// Define Route

// User authentication routes
app.use("/api/users", require("./routes/userRoutes"));

// Society routes
app.use("/api/societies", require("./routes/societyRoutes"));

// Event routes
app.use("/api/create-events", require("./routes/eventRoutes"));
app.use("/api/events", require("./routes/eventCoreRoutes"));
app.use('/api/events', require('./routes/eventImageRoutes'));
app.use('/api/events', require('./routes/faceRecognitionRoutes'));

const PORT = process.env.PORT || 5001;

const shouldRunEmbeddedWorker =
	String(process.env.RUN_FACE_WORKER_IN_API || "false").toLowerCase() === "true";

async function startServer() {
	await connectDB();

	const server = app.listen(PORT, () => console.log(`Main Server running on port : ${PORT}`));

	let embeddedWorker = null;
	if (shouldRunEmbeddedWorker) {
		embeddedWorker = createFaceRecognitionWorker();
		console.log("Embedded face recognition worker started (RUN_FACE_WORKER_IN_API=true)");
	}

	const shutdown = async () => {
		console.log("Shutting down main server...");
		if (embeddedWorker) {
			await embeddedWorker.close();
		}
		server.close(() => process.exit(0));
	};

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
}

if (require.main === module) {
	startServer().catch((err) => {
		console.error("Failed to start main server:", err);
		process.exit(1);
	});
}

module.exports = app;