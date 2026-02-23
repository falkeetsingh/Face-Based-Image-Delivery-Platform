# Face Based Image Delivery Platform

End-to-end platform for event photo delivery using face recognition.

This workspace contains 3 applications:
- `main-server` → core API (auth, societies, events, uploads, orchestration)
- `face-server` → face enrollment + recognition microservice (TensorFlow.js + face-api.js)
- `frontend` → React/Vite client for users and admins

---

## 1) What Is Implemented

### A. Authentication & Membership (main-server)
- User registration with face image support (`imageUrl` or uploaded file)
- Login/logout with JWT stored in `httpOnly` cookie
- Profile endpoint for active session
- Society model with two user journeys:
	- Create a society (user becomes `admin`, `active`)
	- Join a society via code (user becomes `member`, `pending`)
- Join request review flow for admins:
	- List pending requests
	- Approve/reject requests

### B. Event & Image Management (main-server)
- Event CRUD (create/list/details/delete)
- Event image upload to Cloudinary
- Event image deletion (also removes related face matches)
- Role-based access:
	- `member + active` needed for read access
	- `admin + active` needed for write/admin operations

### C. Face Pipeline (face-server)
- Face enrollment endpoint stores descriptors per user
- Event recognition endpoint processes one or many image URLs
- Stores processing metadata (`EventImage`) and recognition outputs (`FaceMatch`)
- Supports partial success: failed image does not fail whole batch

### D. Photo Delivery (main-server + frontend)
- Main server triggers recognition on face-server
- Converts matched face profile IDs into local user records
- Stores event/user/image match records
- Users can fetch their matched images via `/api/users/me/matches`

### E. Frontend UX
- Login/registration/dashboard in a single app shell
- Admin controls for society requests and event operations
- Event image upload + recognition trigger
- Personalized match viewing for members
- Route-based lazy loading (`App` and marketing mosaic page)

---

## 2) Architecture

```text
Frontend (React + Vite)
				|
				v
Main Server (Express + MongoDB + Cloudinary)
	- Auth, society, event, image routes
	- Authorization, cookies, rate limits
	- Calls Face Server via internal API client
				|
				v
Face Server (Express + face-api.js + TensorFlow.js + MongoDB)
	- Model loading
	- Face enrollment
	- Event face detection + matching
```

Databases are logically separated by service DB name:
- `main-server`
- `face-server`

---

## 3) Key API Surface

### main-server (default from code: `PORT || 5001`)

Auth / user:
- `POST /api/users/register`
- `POST /api/users/login`
- `POST /api/users/logout`
- `GET /api/users/profile`
- `GET /api/users/me/matches`

Society:
- `GET /api/societies/me`
- `GET /api/societies/requests`
- `POST /api/societies/requests/:requestId/approve`
- `POST /api/societies/requests/:requestId/reject`

Events:
- `GET /api/events`
- `POST /api/events`
- `GET /api/events/:eventId`
- `DELETE /api/events/:eventId`
- `POST /api/events/:eventId/images`
- `DELETE /api/events/:eventId/images`
- `POST /api/events/:eventId/recognize`

### face-server (`PORT` from env)
- `GET /health`
- `POST /api/users/register-face`
- `POST /api/events/recognize`

Both face-server write endpoints can be protected with `x-internal-key` when `INTERNAL_API_KEY` is set.

---

## 4) Optimization Practices Followed

### A. Face Inference and Matching Optimization
- **Model single-load guard**: models load once (`modelsLoaded` flag), avoiding repeat startup cost.
- **Fixed backend selection**: TF.js CPU backend explicitly set + awaited for stable runtime initialization.
- **Two-stage detection strategy**:
	- TinyFaceDetector first (fast path)
	- SSD MobileNet fallback when needed (accuracy path)
- **Non-Maximum Suppression (NMS)** with IoU threshold to remove duplicate detections.
- **Minimum face area filtering** to skip tiny noisy detections.
- **Distance thresholding + ambiguity margin** to reduce false positives.
- **One-user-per-image enforcement** to avoid duplicate assignment in a single frame.

### B. Throughput, Latency, and Failure Handling
- **Image download retry with exponential backoff** (`1s → 2s → 4s`, max 3 attempts).
- **HTTP timeout for external image fetches** to avoid hanging workers.
- **Batch processing with partial success policy**: one bad image does not abort the whole event.
- **Bulk insert patterns** (`insertMany`) used for event images and face matches.
- **Client-side upload preprocessing** converts images to JPEG and resizes up to max dimension to reduce payload.
- **Client concurrency control** for image conversion to avoid UI stalls and memory spikes.

### C. Database and Query Optimization
- **Indexes for lookup-heavy fields**:
	- face-server: `FaceMatch(eventId, userId)`, `EventImage.eventId`
	- main-server: indexed event/user refs in `FaceMatch`, `EventImage`
- **Compound uniqueness constraints** prevent duplicate writes on retries/re-runs:
	- main-server `FaceMatch(eventId, userId, imageUrl)`
	- main-server `EventImage(eventId, imageUrl)`
- **Ordered=false bulk inserts** in selected flows to continue despite duplicate conflicts.

### D. Security and Operational Hardening
- **Rate limiting** (general + auth-specific windows) in main-server.
- **Security headers** (`nosniff`, `DENY`, strict referrer, permissions policy).
- **JWT in `httpOnly` cookies** with strict same-site policy.
- **CORS origin allow-listing** from env (`CLIENT_URL`) with credentials support.
- **Internal service authentication** via optional `INTERNAL_API_KEY` header.
- **Role-based middleware chain** (`auth -> active member -> admin`) for privileged routes.

### E. Frontend Delivery Optimization
- **Code splitting via `React.lazy` + `Suspense`** for route-level bundles.
- **Centralized request utility with timeout + normalized error mapping** for resilient UX.
- **Optimized Font Loading**: Asynchronous preloading and fallback mechanisms for Google Fonts to prevent render-blocking.
- **Eager WebGL Loading**: Immediate background downloading of heavy WebGL/Three.js bundles combined with instant CSS gradients for placeholders, drastically reducing Largest Contentful Paint (LCP).

---

## 5) Security/Consistency Practices

- Passwords hashed with `bcryptjs` in model pre-save hook.
- JWT verification and explicit expired/invalid token handling.
- Input validation for required payload fields and object ID checks in critical routes.
- Service separation keeps biometric logic isolated from core business API.
- Health endpoints are present in both servers for monitoring and test checks.

---

## 6) Repository Structure

```text
face-server/
	src/
		config/
		middleware/
		models/
		processEvent.js
		recognizeEvent.js
		registerUser.js
		server.js
	models/   (face-api model files)

main-server/
	src/
		config/
		controllers/
		middleware/
		models/
		routes/
		services/
		server.js

frontend/
	src/
		api.js
		App.jsx
		pages/
		components/
```

---

## 7) Local Setup

Install dependencies in each service:

```bash
cd face-server && npm install
cd ../main-server && npm install
cd ../frontend && npm install
```

### A. Required Environment Variables

#### face-server
```env
MONGODB_URI=<mongo-uri>
PORT=4000
INTERNAL_API_KEY=<shared-secret-optional>
```

#### main-server
```env
MONGODB_URI=<mongo-uri>
PORT=5001
JWT_SECRET=<long-random-secret>
CLIENT_URL=http://localhost:5173
FACE_SERVER_URL=http://localhost:4000
INTERNAL_API_KEY=<same-shared-secret-if-used>

CLOUDINARY_CLOUD_NAME=<cloudinary-name>
CLOUDINARY_API_KEY=<cloudinary-key>
CLOUDINARY_API_SECRET=<cloudinary-secret>
```

#### frontend
```env
VITE_API_URL=http://localhost:5001
```

### B. Run Order

Start services in this order:
1. `face-server`
2. `main-server`
3. `frontend`

Example:
```bash
# terminal 1
cd face-server
node src/server.js

# terminal 2
cd main-server
node src/server.js

# terminal 3
cd frontend
npm run dev
```

---

## 8) Tests and Load Scripts

- Health tests exist in both backends:
	- `face-server/tests/health.test.js`
	- `main-server/tests/health.test.js`
- Load script placeholders are present:
	- `face-server/scripts/load-test.js`
	- `main-server/scripts/load-test.js`

Run tests:

```bash
cd face-server && npm test
cd ../main-server && npm test
```

---

## 9) Notes / Current Gaps

- `multer.memoryStorage()` is used; add explicit file size/type limits for stronger upload protection.
- Some legacy docs in `main-server/DEPLOYMENT_CHECKLIST.md` reference older auth token patterns; use current cookie-based auth behavior from source code.
- Cloudinary deletion currently removes DB records but not remote assets unless public IDs are tracked.

---

## 10) Suggested Next Optimization Steps

- Add request-level validation schema layer (e.g., Zod/Joi) to centralize input constraints.
- Add asynchronous queue for recognition jobs when event image counts are large.
- Introduce pagination for event details/matches on large datasets.
- Add observability (structured logs + metrics) around recognition latency and match rates.
