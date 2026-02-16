# Face Server

A Node.js-based face detection and recognition server built with TensorFlow.js and face-api.js. This system enables facial enrollment for users and recognition of faces in event images, powered by advanced deep learning models.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Application Flow](#application-flow)
- [Detection & Recognition Thresholds](#detection--recognition-thresholds)
- [Error Handling](#error-handling)

---

## Features

✅ **Face Enrollment**: Register user faces with automatic feature extraction and storage
✅ **Face Recognition**: Detect and recognize faces in event images with distance scoring
✅ **Batch Processing**: Process multiple images in a single event
✅ **Duplicate Detection**: Remove duplicate face detections using Non-Maximum Suppression (NMS)
✅ **MongoDB Integration**: Persistent storage of users, events, and face matches
✅ **Robust Error Handling**: Network retry logic and comprehensive error messages
✅ **Multiple Detection Models**: SSD MobileNetV1 for fast, accurate face detection

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     Face Server (Node.js)                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Express Server (Port 4000)                                        │
│  ├─ POST /users/register-face      (User Enrollment)              │
│  └─ POST /api/events/recognize     (Event Face Recognition)       │
│                                                                    │
├──────────────────────────────────────────────────────────────────┤
│                    Face-API.js Engine                              │
│  ├─ SSD MobileNetV1 (Face Detection)                              │
│  ├─ Face Landmark 68 (Facial Landmarks)                           │
│  └─ Face Recognition Net (128-D Face Descriptors)                 │
├──────────────────────────────────────────────────────────────────┤
│                   TensorFlow.js (CPU Backend)                      │
├──────────────────────────────────────────────────────────────────┤
│                      MongoDB Database                              │
│  ├─ Users (User profiles + Face Descriptors)                      │
│  ├─ Events (Event metadata)                                       │
│  ├─ EventImages (Image-level processing info)                     │
│  └─ FaceMatches (Recognition results)                             │
└──────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Technology        | Version | Purpose                         |
| ----------------- | ------- | ------------------------------- |
| **Node.js**       | -       | JavaScript runtime              |
| **Express.js**    | ^5.2.1  | HTTP server framework           |
| **face-api.js**   | ^0.22.2 | Face detection & recognition    |
| **TensorFlow.js** | ^4.22.0 | Machine learning framework      |
| **Canvas**        | ^3.2.0  | Image processing in Node.js     |
| **Mongoose**      | ^9.1.2  | MongoDB ODM                     |
| **Axios**         | ^1.13.2 | HTTP client for image downloads |
| **dotenv**        | ^17.2.3 | Environment variable management |
| **Nodemon**       | ^3.1.11 | Development auto-reload         |

---

## Installation & Setup

### Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account (or local MongoDB instance)
- Internet connection (for downloading pre-trained models)

### Steps

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd face-server
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Create `.env` file** in the root directory:

   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?appName=face-server
   PORT=4000
   ```

4. **Verify models directory**
   Ensure the `models/` directory contains pre-trained face-api.js models:
   - `ssd_mobilenetv1_model-shard1`, `ssd_mobilenetv1_model-weights_manifest.json`
   - `face_landmark_68_model-shard1`, `face_landmark_68_model-weights_manifest.json`
   - `face_recognition_model-shard1`, `face_recognition_model-shard2`, `face_recognition_model-weights_manifest.json`

5. **Start the server**

   ```bash
   node src/server.js
   ```

   Or with auto-reload (development):

   ```bash
   npx nodemon src/server.js
   ```

   Expected output:

   ```
   Face-api models loaded
   Face server running on 4000
   ```

---

## Configuration

### Environment Variables

| Variable      | Type   | Description                                |
| ------------- | ------ | ------------------------------------------ |
| `MONGODB_URI` | String | MongoDB connection string with credentials |
| `PORT`        | Number | Server port (default: 4000)                |

### Face-API Models

Three pre-trained models are loaded on startup:

1. **SSD MobileNetV1** - Fast face detection model
2. **Face Landmark 68** - Detects 68 facial landmarks
3. **Face Recognition Net** - Generates 128-dimensional face descriptors

---

## Database Schema

### Users Collection

Stores registered users and their facial embeddings.

```javascript
{
  _id: ObjectId,
  userId: String,                 // Unique user identifier
  faceDescriptors: [[Number]],    // Array of 128-D face vectors
  createdAt: Date
}
```

**Example:**

```javascript
{
  userId: "user123",
  faceDescriptors: [
    [0.123, -0.456, 0.789, ...],  // First enrolled face
    [-0.234, 0.567, -0.890, ...]  // Second enrolled face (optional)
  ],
  createdAt: 2026-01-22T10:30:00Z
}
```

### Events Collection

Metadata about events being processed.

```javascript
{
  _id: ObjectId,
  eventId: String,          // Unique event identifier
  societyId: String,        // Organization/society ID
  name: String,             // Event name
  status: String,           // "processing" or "ready"
  createAt: Date
}
```

### EventImages Collection

Tracks individual images within an event.

```javascript
{
  _id: ObjectId,
  eventId: String,          // Reference to event
  imageUrl: String,         // URL of the image
  processed: Boolean,       // Processing status
  faceCount: Number,        // Number of faces detected (-1 if failed)
  createdAt: Date
}
```

### FaceMatches Collection

Recognition results linking detected faces to users.

```javascript
{
  _id: ObjectId,
  eventId: String,          // Reference to event
  imageUrl: String,         // Source image URL
  userId: String,           // Matched user ID (null if unknown)
  faceIndex: Number,        // Face position in image
  distance: Number,         // Euclidean distance (0-0.6)
  createdAt: Date
}
```

---

## API Endpoints

### 1. Register User Face

**Endpoint:** `POST /users/register-face`

Enrolls a single user face by downloading an image, detecting the face, extracting facial features, and storing them in the database.

#### Request

```json
{
  "userId": "user123",
  "imageUrl": "https://example.com/face.jpg"
}
```

| Field      | Type   | Required | Description                             |
| ---------- | ------ | -------- | --------------------------------------- |
| `userId`   | String | ✓        | Unique identifier for the user          |
| `imageUrl` | String | ✓        | URL to accessible image containing face |

#### Response (Success)

```json
{
  "success": true,
  "message": "Face registered successfully"
}
```

**Status Code:** `200 OK`

#### Response (Error)

```json
{
  "success": false,
  "message": "No face detected in image"
}
```

**Status Codes:**

- `400 Bad Request` - Missing required fields
- `500 Internal Server Error` - Face detection failed or network issues

#### Examples

**Using cURL:**

```bash
curl -X POST http://localhost:4000/users/register-face \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "john_doe",
    "imageUrl": "https://example.com/john_profile.jpg"
  }'
```

**Using JavaScript/Fetch:**

```javascript
const response = await fetch("http://localhost:4000/users/register-face", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId: "john_doe",
    imageUrl: "https://example.com/john_profile.jpg",
  }),
});
const data = await response.json();
console.log(data);
```

**Using Python:**

```python
import requests

response = requests.post('http://localhost:4000/users/register-face', json={
    'userId': 'john_doe',
    'imageUrl': 'https://example.com/john_profile.jpg'
})
print(response.json())
```

---

### 2. Recognize Faces in Event Images

**Endpoint:** `POST /api/events/recognize`

Processes multiple images from an event, detects all faces, compares them against registered users, and stores results in the database.

#### Request

```json
{
  "eventId": "event_2026_01_22",
  "imageUrls": [
    "https://example.com/photo1.jpg",
    "https://example.com/photo2.jpg"
  ]
}
```

| Field       | Type          | Required | Description                     |
| ----------- | ------------- | -------- | ------------------------------- |
| `eventId`   | String        | ✓        | Unique identifier for the event |
| `imageUrls` | Array[String] | ✓        | Array of URLs to event images   |

**Legacy Support:** Also accepts `imageUrl` (single string) for backwards compatibility.

#### Response (Success)

```json
{
  "eventId": "event_2026_01_22",
  "imagesProcessed": 2,
  "totalFacesDetected": 7,
  "matchedUsers": [
    {
      "userId": "user123",
      "distance": 0.245,
      "imageUrl": "https://example.com/photo1.jpg"
    },
    {
      "userId": "user456",
      "distance": 0.189,
      "imageUrl": "https://example.com/photo2.jpg"
    }
  ],
  "summary": {
    "totalImages": 2,
    "successfulImages": 2,
    "knownFacesFound": 2
  }
}
```

**Status Code:** `200 OK`

#### Response Fields

| Field                      | Type   | Description                                |
| -------------------------- | ------ | ------------------------------------------ |
| `eventId`                  | String | The event being processed                  |
| `imagesProcessed`          | Number | Total images successfully processed        |
| `totalFacesDetected`       | Number | Sum of all faces detected across images    |
| `matchedUsers`             | Array  | List of recognized faces with user matches |
| `summary.totalImages`      | Number | Total images requested                     |
| `summary.successfulImages` | Number | Images processed without errors            |
| `summary.knownFacesFound`  | Number | Faces matched to registered users          |

#### Response (Error)

```json
{
  "error": "Unable to access the image URL. The image may be unavailable or the server is not responding.",
  "details": "Failed to download image after 3 attempts: ENOTFOUND example.com"
}
```

**Status Codes:**

- `400 Bad Request` - Missing required fields or invalid request
- `500 Internal Server Error` - Internal processing error
- `502 Bad Gateway` - Cannot download image URL
- `504 Gateway Timeout` - Network connection issues

#### Examples

**Using cURL:**

```bash
curl -X POST http://localhost:4000/api/events/recognize \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "event_2026_01_22",
    "imageUrls": [
      "https://example.com/photo1.jpg",
      "https://example.com/photo2.jpg"
    ]
  }'
```

**Using JavaScript/Fetch:**

```javascript
const response = await fetch("http://localhost:4000/api/events/recognize", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    eventId: "event_2026_01_22",
    imageUrls: [
      "https://example.com/photo1.jpg",
      "https://example.com/photo2.jpg",
    ],
  }),
});
const data = await response.json();
console.log(data);
```

**Using Python:**

```python
import requests

response = requests.post('http://localhost:4000/api/events/recognize', json={
    'eventId': 'event_2026_01_22',
    'imageUrls': [
        'https://example.com/photo1.jpg',
        'https://example.com/photo2.jpg'
    ]
})
result = response.json()
print(f"Found {result['summary']['knownFacesFound']} known faces")
```

---

## Application Flow

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER ENROLLMENT FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Client sends /users/register-face request                    │
│     ├─ userId: "user123"                                         │
│     └─ imageUrl: "https://example.com/face.jpg"                  │
│                                                                   │
│  2. Server downloads image from URL                              │
│     └─ Retry logic: 3 attempts with exponential backoff          │
│                                                                   │
│  3. Detect face & extract features                               │
│     ├─ Load face from buffer                                     │
│     ├─ SSD MobileNetV1 detection                                 │
│     ├─ Face Landmark 68 detection                                │
│     └─ Face Recognition Net (128-D descriptor)                   │
│                                                                   │
│  4. Throw error if no face detected                              │
│     └─ Return 500 "No face detected in image"                    │
│                                                                   │
│  5. Convert descriptor to array (Float32Array → Array)           │
│                                                                   │
│  6. Store in MongoDB (Users collection)                          │
│     ├─ If user exists: $push new descriptor to array             │
│     └─ If user new: Create document with descriptor              │
│                                                                   │
│  7. Return success response (200)                                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 EVENT RECOGNITION FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Client sends /api/events/recognize request                   │
│     ├─ eventId: "event_2026_01_22"                               │
│     └─ imageUrls: ["url1.jpg", "url2.jpg", ...]                  │
│                                                                   │
│  2. Load all registered users from MongoDB                       │
│     ├─ Extract userId and latest faceDescriptor                  │
│     └─ Filter users with valid descriptors                       │
│                                                                   │
│  3. For each image URL:                                          │
│     │                                                             │
│     ├─ Create EventImage document in DB                          │
│     │                                                             │
│     ├─ Download image from URL (retry: 3x, timeout: 30s)        │
│     │                                                             │
│     ├─ Call ProcessEvent():                                      │
│     │  ├─ Detect all faces (SSD MobileNetV1)                    │
│     │  ├─ Extract landmarks & descriptors                        │
│     │  ├─ Non-Maximum Suppression (NMS)                         │
│     │  │  └─ Remove duplicate detections (IoU < 0.3)             │
│     │  ├─ Compare faces to registered users                      │
│     │  │  ├─ Create FaceMatcher from user descriptors           │
│     │  │  ├─ Find best match for each face                      │
│     │  │  └─ Distance threshold: 0.6                             │
│     │  └─ Avoid duplicate users per image                        │
│     │                                                             │
│     ├─ Update EventImage (mark processed, save face count)       │
│     │                                                             │
│     └─ Collect results                                           │
│                                                                   │
│  4. Save all FaceMatch documents to DB                           │
│     └─ Only known faces (userId !== null)                        │
│                                                                   │
│  5. Return comprehensive response with:                          │
│     ├─ Event & image stats                                       │
│     ├─ Matched users with distances                              │
│     └─ Processing summary                                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Detailed Process Event Steps

#### Step 1: Face Detection

- Uses **SSD MobileNetV1** model
- Detects all faces in the image
- Minimum confidence threshold: **60%**
- Extracts 68 facial landmarks and 128-D face descriptor for each face

#### Step 2: Non-Maximum Suppression (NMS)

- Removes duplicate detections of the same face
- Sorts faces by confidence score (highest first)
- Removes overlapping boxes with Intersection over Union (IoU) > **0.3**
- Formula: `IoU = intersection / union`

#### Step 3: Face Matching

- Creates a `FaceMatcher` from all registered user descriptors
- For each detected face, finds the closest matching user
- Uses **Euclidean distance** to measure similarity
- Matches with distance < **0.6** are considered positive
- Distance ≥ 0.6 or no registered users = "unknown" face

#### Step 4: Duplicate User Prevention

- Tracks which users have already been matched in the current image
- If same user detected twice in same image, second match marked as "unknown"
- Ensures unique users per image

#### Step 5: Database Storage

- Saves `EventImage` document (image-level metadata)
- Saves `FaceMatch` documents (face-level results)
- Only stores matches with recognized users

---

## Detection & Recognition Thresholds

| Parameter          | Value     | Purpose                                       |
| ------------------ | --------- | --------------------------------------------- |
| **MIN_CONFIDENCE** | 0.6 (60%) | Minimum SSD MobileNetV1 detection score       |
| **MAX_DISTANCE**   | 0.6       | Maximum Euclidean distance for positive match |
| **IOU_THRESHOLD**  | 0.3       | Maximum overlap to consider faces as same     |

### Understanding Distance Values

- **0.0** - Perfect match (identical face descriptors)
- **0.2-0.4** - Very confident match (high probability same person)
- **0.4-0.6** - Moderate match (likely same person)
- **> 0.6** - Low confidence (treated as "unknown")

### Adjusting Thresholds

Edit the thresholds in [src/processEvent.js](src/processEvent.js#L6-L8):

```javascript
const MAX_DISTANCE = 0.6; // Increase to accept looser matches
const MIN_CONFIDENCE = 0.6; // Decrease to detect smaller faces
const IOU_THRESHOLD = 0.3; // Decrease to remove more duplicates
```

---

## Error Handling

### Network Errors

**Issue:** Cannot download image

**Solution:** Automatic retry logic

- Attempts: 3 retries
- Timeout: 30 seconds per attempt
- Backoff: Exponential (1s, 2s, 4s wait times)
- Error codes: `ETIMEDOUT`, `ECONNREFUSED`
- HTTP Status: `502 Bad Gateway`

### Face Detection Errors

**Issue:** "No face detected in image"

**Solutions:**

- Ensure face is clearly visible
- Check image brightness and contrast
- Verify minimum face size (>80x80 pixels)
- Increase `MIN_CONFIDENCE` threshold in processEvent.js

### Database Errors

**Issue:** MongoDB connection failures

**Solutions:**

- Verify `MONGODB_URI` in .env file
- Check credentials and database name
- Ensure network access from server to MongoDB
- Verify IP whitelist in MongoDB Atlas

### Memory Errors

**Issue:** Out of memory when processing large batches

**Solutions:**

- Process images sequentially (current implementation)
- Reduce image resolution before uploading
- Monitor Node.js memory usage: `node --max-old-space-size=4096 src/server.js`

---

## Example Workflows

### Complete User Registration Workflow

```javascript
// Step 1: Register user face
const enrollResponse = await fetch(
  "http://localhost:4000/users/register-face",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: "alice_johnson",
      imageUrl: "https://cdn.example.com/users/alice_2026.jpg",
    }),
  },
);

if (enrollResponse.ok) {
  console.log("Face registered successfully");

  // Step 2: Later, use this user for event recognition
  const eventResponse = await fetch(
    "http://localhost:4000/api/events/recognize",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: "conference_2026_01_22",
        imageUrls: [
          "https://cdn.example.com/events/photo_001.jpg",
          "https://cdn.example.com/events/photo_002.jpg",
        ],
      }),
    },
  );

  const eventResult = await eventResponse.json();
  console.log(`Found ${eventResult.summary.knownFacesFound} known faces`);
}
```

### Event Processing with Error Handling

```javascript
async function processEventWithRetry(eventId, imageUrls, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        "http://localhost:4000/api/events/recognize",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, imageUrls }),
        },
      );

      if (response.ok) {
        return await response.json();
      } else if (response.status === 502 || response.status === 504) {
        console.log(
          `Attempt ${attempt}/${maxRetries} failed with status ${response.status}`,
        );
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 2000 * attempt)); // Backoff
          continue;
        }
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (attempt === maxRetries) throw error;
    }
  }
}

// Usage
const result = await processEventWithRetry("event_id", ["url1", "url2"]);
```

---

## Monitoring & Debugging

### Server Logs

```bash
# Start with verbose logging
NODE_DEBUG=http node src/server.js

# Monitor memory usage
node --trace-warnings src/server.js

# Profile performance
node --prof src/server.js
```

### Database Queries

Check stored face matches:

```javascript
// MongoDB Shell
db.facematches.find({ eventId: "event_2026_01_22" });
db.eventimages.find({ eventId: "event_2026_01_22" });
db.users.findOne({ userId: "user123" });
```

### Performance Metrics

- **Face Detection:** ~200-500ms per image (SSD MobileNetV1)
- **Face Recognition:** ~50-100ms per face (FaceRecognitionNet)
- **Image Download:** Variable (network dependent)
- **Database Write:** ~10-50ms per document

---

## Security Considerations

⚠️ **Important:** This is a demonstration server. For production use:

1. **Add Authentication**
   - Implement JWT or API key validation
   - Protect endpoints with middleware

2. **Validate Inputs**
   - Sanitize URL inputs
   - Validate image formats and sizes
   - Rate limiting on endpoints

3. **Secure Credentials**
   - Never commit `.env` files to version control
   - Use environment variables for all secrets
   - Rotate MongoDB credentials regularly

4. **HTTPS/TLS**
   - Use HTTPS in production
   - Implement CORS properly

5. **Data Privacy**
   - Ensure GDPR/CCPA compliance
   - Implement data retention policies
   - Hash sensitive identifiers

---

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit pull request

---

## License

ISC

---

## Troubleshooting

| Problem                  | Solution                                                             |
| ------------------------ | -------------------------------------------------------------------- |
| Models not loading       | Verify `models/` directory structure and weights manifest files      |
| "No face detected"       | Ensure image has clear, frontal face; check MIN_CONFIDENCE threshold |
| MongoDB connection fails | Verify credentials, IP whitelist, and network connectivity           |
| Image download timeout   | Check network speed; increase timeout in processEvent.js             |
| Out of memory            | Use Node.js flag: `--max-old-space-size=4096`                        |
| Duplicate faces matched  | Reduce IOU_THRESHOLD in processEvent.js                              |

---

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review error messages in server logs
3. Verify all environment variables are set correctly
4. Check MongoDB connection and credentials

---

**Version:** 1.0.0  
**Last Updated:** January 22, 2026
