const express = require('express');
const { LoadModels } = require('./config/face-api.js');
require('dotenv').config();
const connectDB = require('./config/db');
const verifyInternalApiKey = require('./middleware/internalApiKey');

const app = express();

// body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ ok: true });
});


//face enrollement endpoint
const registerUserFace = require('./registerUser');
app.post('/api/users/register-face', verifyInternalApiKey, async (req, res) => {
  try {
    const { userId, imageUrl, name } = req.body;

    if (!userId || !imageUrl) {
      return res.status(400).json({ message: "userId and imageUrl are required" })
    }

    await registerUserFace(userId, imageUrl, name);

    res.json({
      success: true,
      message: "Face registered successfully"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
});

//event recognition endpoint
const recognizeEvent = require('./recognizeEvent');
app.post('/api/events/recognize', verifyInternalApiKey, recognizeEvent);

async function start() {
  await connectDB();
  await LoadModels()

  app.listen(process.env.PORT, () => {
    console.log(`Face server running on ${process.env.PORT}`)
  })
}

if (require.main === module) {
  start();
}

module.exports = app;
