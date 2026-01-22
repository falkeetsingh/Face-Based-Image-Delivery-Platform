const fs = require('fs');
const path = require('path');
const { Image } = require('canvas');
const { faceapi } = require('./config/face-api');

// Thresholds
const MAX_DISTANCE = 0.6;
const MIN_CONFIDENCE = 0.6;
const IOU_THRESHOLD = 0.3;

async function ProcessEvent(imageUrl, registeredUsers) {
  const { default: axios } = await import('axios'); // dynamic import for axios
  
  // Download image with timeout and retry logic
  let response;
  const maxRetries = 3;
  const timeout = 30000; // 30 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Downloading image (attempt ${attempt}/${maxRetries}): ${imageUrl}`);
      response = await axios.get(imageUrl, { 
        responseType: 'arraybuffer',
        timeout: timeout,
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 300
      });
      break; // Success, exit retry loop
    } catch (error) {
      console.error(`Download attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw new Error(`Failed to download image after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Exponential backoff: wait 1s, 2s, 4s between retries
      const waitTime = Math.pow(2, attempt - 1) * 1000;
      console.log(`Retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  const img = new Image();
  img.src = Buffer.from(response.data);

  // 1️⃣ Detect all faces
  const detections = await faceapi
    .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: MIN_CONFIDENCE }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  console.log(`Detections: ${detections.length}`);

  // 2️⃣ Non-Maximum Suppression to remove duplicates
  const sorted = detections
    .map((d, i) => ({ idx: i, det: d }))
    .sort((a, b) => (b.det.detection.score ?? 0) - (a.det.detection.score ?? 0));

  const kept = [];
  for (const { det } of sorted) {
    const shouldKeep = kept.every(k => iou(det.detection.box, k.detection.box) < IOU_THRESHOLD);
    if (shouldKeep) kept.push(det);
  }

  // 3️⃣ Build FaceMatcher
  const labeled = registeredUsers.map(u => new faceapi.LabeledFaceDescriptors(
    u.userId,
    [u.descriptor]
  ));
  const matcher = new faceapi.FaceMatcher(labeled, MAX_DISTANCE);

  // 4️⃣ Match faces
  const usedUsers = new Set();
  const matchedResults = [];

  for (const [index, det] of kept.entries()) {
    const best = matcher.findBestMatch(det.descriptor);
    const label = best.label;
    const distance = Number(best.distance.toFixed(3));

    // Avoid duplicate users in the same image
    if (label !== 'unknown' && usedUsers.has(label)) {
      matchedResults.push({ faceIndex: index, user: 'unknown', distance });
      continue;
    }

    if (label !== 'unknown') usedUsers.add(label);

    // Return objects that can directly map to FaceMatch model
    matchedResults.push({
      faceIndex: index,
      userId: label !== 'unknown' ? label : null,
      distance,
      imageUrl
    });
  }

  // 5️⃣ Helper function: IoU
  function iou(aBox, bBox) {
    const ax1 = aBox.x;
    const ay1 = aBox.y;
    const ax2 = aBox.x + aBox.width;
    const ay2 = aBox.y + aBox.height;

    const bx1 = bBox.x;
    const by1 = bBox.y;
    const bx2 = bBox.x + bBox.width;
    const by2 = bBox.y + bBox.height;

    const ix1 = Math.max(ax1, bx1);
    const iy1 = Math.max(ay1, by1);
    const ix2 = Math.min(ax2, bx2);
    const iy2 = Math.min(ay2, by2);

    const iw = Math.max(0, ix2 - ix1);
    const ih = Math.max(0, iy2 - iy1);
    const inter = iw * ih;

    const aArea = (ax2 - ax1) * (ay2 - ay1);
    const bArea = (bx2 - bx1) * (by2 - by1);
    const union = aArea + bArea - inter;

    return union > 0 ? inter / union : 0;
  }

  return matchedResults;
}

module.exports = ProcessEvent;
