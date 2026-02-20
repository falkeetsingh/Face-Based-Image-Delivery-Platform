const axios = require('axios');
const { Image } = require('canvas');
const { faceapi } = require('./config/face-api');

// Thresholds
const MAX_DISTANCE = 0.52;
const MIN_CONFIDENCE = 0.6;
const IOU_THRESHOLD = 0.3;
const MIN_FACE_AREA = 3600;
const AMBIGUITY_MARGIN = 0.04;

async function ProcessEvent(imageUrl, registeredUsers) {
  // Download image with timeout and retry logic
  let response;
  const maxRetries = 3;
  const timeout = 15000;
  
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

  // 1️⃣ Detect all faces (tiny detector first for speed, SSD fallback for harder frames)
  let detections = await faceapi
    .detectAllFaces(
      img,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.45 })
    )
    .withFaceLandmarks(true)
    .withFaceDescriptors();

  if (!detections.length) {
    detections = await faceapi
      .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: MIN_CONFIDENCE }))
      .withFaceLandmarks()
      .withFaceDescriptors();
  }

  // 2️⃣ Non-Maximum Suppression to remove duplicates
  const sorted = detections
    .map((d, i) => ({ idx: i, det: d }))
    .sort((a, b) => (b.det.detection.score ?? 0) - (a.det.detection.score ?? 0));

  const kept = [];
  for (const { det } of sorted) {
    const area = (det.detection?.box?.width || 0) * (det.detection?.box?.height || 0);
    if (area < MIN_FACE_AREA) {
      continue;
    }

    const shouldKeep = kept.every(k => iou(det.detection.box, k.detection.box) < IOU_THRESHOLD);
    if (shouldKeep) kept.push(det);
  }

  // 4️⃣ Match faces
  const usedUsers = new Set();
  const matchedResults = [];

  const distance = (a, b) => {
    let sum = 0;
    for (let i = 0; i < a.length; i += 1) {
      const d = a[i] - b[i];
      sum += d * d;
    }
    return Math.sqrt(sum);
  };

  const getBestAndSecond = (faceDescriptor) => {
    const ranked = [];

    for (const user of registeredUsers) {
      if (!user.descriptors || !user.descriptors.length) {
        continue;
      }

      let bestUserDistance = Infinity;
      for (const known of user.descriptors) {
        const current = distance(faceDescriptor, known);
        if (current < bestUserDistance) {
          bestUserDistance = current;
        }
      }

      ranked.push({
        userId: user.userId,
        name: user.name,
        distance: bestUserDistance
      });
    }

    ranked.sort((a, b) => a.distance - b.distance);
    return {
      best: ranked[0] || null,
      second: ranked[1] || null
    };
  };

  for (const [index, det] of kept.entries()) {
    const { best, second } = getBestAndSecond(det.descriptor);

    let matchedUserId = null;
    let matchedName = null;
    let matchedDistance = best ? Number(best.distance.toFixed(3)) : null;

    if (best && best.distance <= MAX_DISTANCE) {
      const clearlyBetter = !second || (second.distance - best.distance) >= AMBIGUITY_MARGIN;
      if (clearlyBetter) {
        matchedUserId = best.userId;
        matchedName = best.name;
      }
    }

    // Avoid duplicate users in the same image
    if (matchedUserId && usedUsers.has(matchedUserId)) {
      matchedResults.push({
        faceIndex: index,
        userId: null,
        name: null,
        distance: matchedDistance,
        imageUrl
      });
      continue;
    }

    if (matchedUserId) {
      usedUsers.add(matchedUserId);
    }

    matchedResults.push({
      faceIndex: index,
      userId: matchedUserId,
      name: matchedName,
      distance: matchedDistance,
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
