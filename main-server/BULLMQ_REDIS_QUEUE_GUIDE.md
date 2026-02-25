# BullMQ + Redis Queue Guide (Beginner Friendly)

This guide explains what was added, why it matters, and exactly how to run it.

---

## 1) What Problem This Solves

Before this change, calling `POST /api/events/:eventId/recognize` waited for full face recognition to finish.

That causes:

- Slow API responses (can take a long time for many images)
- Timeouts under load
- Poor scaling when multiple events are recognized together

Now recognition is **asynchronous**:

- API quickly queues a job and returns `202 Accepted`
- Worker process picks up the job and performs recognition in background
- Client checks job status endpoint until completion

---

## 2) What Redis, BullMQ, and a Queue Mean

### Redis (simple meaning)

Redis is a very fast in-memory data store. BullMQ uses it to store job state.

### BullMQ (simple meaning)

BullMQ is a Node.js library that gives you queues:

- add jobs
- process jobs with workers
- retry failed jobs
- track progress and status

### Queue (simple meaning)

A queue is a waiting line for background tasks.

In this project:

- each recognition run is one queue job
- queue name is `face-recognition`

---

## 3) Architecture After Changes

1. Frontend/Admin calls recognition endpoint
2. Main API validates request and enqueues BullMQ job
3. Worker service consumes the job
4. Worker calls `face-server` recognition API
5. Worker maps recognized `faceProfileId` to local users and stores `FaceMatch`
6. Job status is updated in DB and queue

---

## 4) Files Added/Changed and Why They Matter

## Added

- `src/config/redis.js`
  - Central Redis connection config from env variables.

- `src/queues/faceRecognitionQueue.js`
  - Queue definition + retries/backoff + retention settings.

- `src/models/RecognitionJob.js`
  - Persistent job tracking model (`queued`, `active`, `completed`, `failed`).

- `src/workers/faceRecognitionWorker.js`
  - Worker logic that processes queued recognition jobs.

- `src/workers/startFaceRecognitionWorker.js`
  - Worker process entrypoint (`npm run worker:face`).

## Changed

- `src/controllers/faceRecognitionController.js`
  - Recognition endpoint now enqueues jobs instead of blocking.
  - Added job status/list/metrics APIs.

- `src/routes/faceRecognitionRoutes.js`
  - Added queue/job endpoints.

- `package.json`
  - Added dependencies `bullmq`, `ioredis`
  - Added script `worker:face`

---

## 5) New API Behavior

## Enqueue recognition

`POST /api/events/:eventId/recognize`

Returns immediately with:

- `jobId`
- `eventId`
- `imageCount`

If same event already queued/running, it returns existing job info.

Use `?force=true` if you want to rerun after completion.

## Check one job

`GET /api/events/recognition/jobs/:jobId`

Returns:

- state/status
- progress
- attempts
- summary
- error (if failed)

## List jobs

`GET /api/events/recognition/jobs?eventId=<optional>&limit=<optional>`

## Queue metrics

`GET /api/events/recognition/metrics`

Returns queue counts (`waiting`, `active`, `completed`, `failed`, etc.).

---

## 6) Environment Variables (Main Server)

Add these to `main-server/.env`:

```env
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

FACE_RECOGNITION_QUEUE=face-recognition
FACE_RECOGNITION_WORKER_CONCURRENCY=1
FACE_RECOGNITION_JOB_ATTEMPTS=3
FACE_RECOGNITION_BACKOFF_MS=2000
FACE_RECOGNITION_COMPLETE_TTL_SECONDS=86400
FACE_RECOGNITION_FAIL_TTL_SECONDS=604800
FACE_RECOGNITION_LOCK_MS=300000
FACE_RECOGNITION_WAITING_ALERT_THRESHOLD=20
FACE_RECOGNITION_FAILED_ALERT_THRESHOLD=5
```

You still need existing vars (`MONGODB_URI`, `FACE_SERVER_URL`, `INTERNAL_API_KEY`, etc.).

---

## 7) How to Run on Windows

Choose one of these Redis options.

## Option A: Docker Desktop (easy and recommended)

```powershell
docker run --name fbidp-redis -p 6379:6379 -d redis:7-alpine
```

To stop:

```powershell
docker stop fbidp-redis
```

To start again:

```powershell
docker start fbidp-redis
```

## Option B: WSL Ubuntu

Inside WSL:

```bash
sudo apt update
sudo apt install redis-server -y
sudo service redis-server start
```

---

## 8) Full Local Startup Order

1. Start Redis
2. Start `face-server`
3. Start `main-server` API
4. Start `main-server` worker
5. Start frontend

Example commands:

```powershell
# terminal 1 (redis via docker)
docker start fbidp-redis

# terminal 2
cd face-server
node src/server.js

# terminal 3
cd main-server
node src/server.js

# terminal 4
cd main-server
npm run worker:face

# terminal 5
cd frontend
npm run dev
```

---

## 9) Why This Is Important

- Better user experience (no long blocking call)
- Better throughput under multiple recognition requests
- Safer retries for temporary failures
- Easier operational visibility with status + metrics endpoints
- Cleaner horizontal scaling (add worker instances as load grows)

---

## 10) Practical Tips

- Start with `FACE_RECOGNITION_WORKER_CONCURRENCY=1` for CPU-heavy jobs.
- Increase workers (multiple worker processes/containers) before increasing per-process concurrency too much.
- Keep `jobId` dedupe (`recognize-<eventId>`) to avoid duplicate event runs.
- Use `?force=true` only when intentionally re-running recognition.

---

## 11) Staged Rollout Checklist

Use this order in production-like environments:

1. Deploy code with worker support and new APIs.
2. Keep worker process disabled and verify API health.
3. Start one worker instance and test with one internal event.
4. Watch `/api/events/recognition/metrics` for backlog/failure alerts.
5. Increase worker replicas only after stable success/failure rates.
6. Train frontend/admin users to poll status endpoint using returned `jobId`.
7. For rollback, stop worker process and temporarily avoid enqueue calls.

---

## 12) Worker Logs You Will See

After this update, worker logs now show full sequencing in console.

Examples:

- `WORKER_READY` (worker connected and ready)
- `EVENT_ACTIVE` (job picked from queue)
- `START` (job payload summary)
- `FACE_SERVER_REQUEST` and `FACE_SERVER_RESPONSE`
- `DB_OPERATIONS_PREPARED` and `DB_BULK_WRITE_DONE`
- `PROGRESS 10/65/100`
- `COMPLETE` with final summary
- `EVENT_FAILED` + stack trace if anything breaks

This makes it easy to verify queue flow end-to-end and diagnose where a job is stuck.
