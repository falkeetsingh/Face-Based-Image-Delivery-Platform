require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const upload = require("./middleware/upload");

const app = express();

const corsOptions = {
	origin: process.env.CLIENT_URL || "http://localhost:5173",
	credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (req, res) => {
	res.json({ ok: true });
});

// Define Route

// User authentication routes
app.use("/api/users", require("./routes/userRoutes"));

// Event routes
app.use("/api/create-events", require("./routes/eventRoutes"));
app.use('/api/events', require('./routes/eventImageRoutes'));
app.use('/api/events', require('./routes/faceRecognitionRoutes'));

const PORT = process.env.PORT || 5000;
if (require.main === module) {
	connectDB();
	app.listen(PORT, () => console.log(`Main Server running on port : ${PORT}`));
}

module.exports = app;