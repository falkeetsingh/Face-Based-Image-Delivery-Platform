const axios = require('axios');
const { Image } = require('canvas');
const { faceapi } = require('./config/face-api');
const User = require('./models/User');

async function registerUserFace(userId, imageUrl) {
  //Download image
  const response = await axios.get(imageUrl, {
    responseType: 'arraybuffer'
  });

  const img = new Image();
  img.src = Buffer.from(response.data);

  // Detect single face
  const detection = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    throw new Error('No face detected in image');
  }

  //Convert descriptor to normal array
  const descriptorArray = Array.from(detection.descriptor);

  //Store in DB (append if user exists)
  await User.updateOne(
    { userId },
    { $push: { faceDescriptors: descriptorArray } },
    { upsert: true }
  );

  return true;
}

module.exports = registerUserFace;
