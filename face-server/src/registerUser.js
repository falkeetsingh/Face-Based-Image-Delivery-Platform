const axios = require('axios');
const { Image } = require('canvas');
const { faceapi } = require('./config/face-api');
const User = require('./models/User');

async function registerUserFace(userId, imageUrl, name = null) {
  //Download image
  const response = await axios.get(imageUrl, {
    responseType: 'arraybuffer'
  });

  const img = new Image();
  img.src = Buffer.from(response.data);

  const selectBestFace = (detections) => {
    if (!detections || !detections.length) {
      return null;
    }

    return detections
      .slice()
      .sort((a, b) => {
        const areaA = (a.detection?.box?.width || 0) * (a.detection?.box?.height || 0);
        const areaB = (b.detection?.box?.width || 0) * (b.detection?.box?.height || 0);
        if (areaB !== areaA) {
          return areaB - areaA;
        }

        const scoreA = a.detection?.score || 0;
        const scoreB = b.detection?.score || 0;
        return scoreB - scoreA;
      })[0];
  };

  // Strategy 1: SSD detector with relaxed confidence
  let detections = await faceapi
    .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.35 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  let detection = selectBestFace(detections);

  // Strategy 2: Tiny face detector fallback for difficult images
  if (!detection) {
    detections = await faceapi
      .detectAllFaces(
        img,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.3 })
      )
      .withFaceLandmarks(true)
      .withFaceDescriptors();

    detection = selectBestFace(detections);
  }

  if (!detection) {
    throw new Error('No face detected in image. Try a clear, front-facing image with good lighting.');
  }

  //Convert descriptor to normal array
  const descriptorArray = Array.from(detection.descriptor);

  //Store in DB (append if user exists)
  await User.updateOne(
    { userId },
    {
      $push: { faceDescriptors: descriptorArray },
      $set: { name: name }  // Store name if provided
    },
    { upsert: true }
  );

  return true;
}

module.exports = registerUserFace;
