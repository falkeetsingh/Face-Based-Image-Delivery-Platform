# Deployment Checklist - User Registration & Authentication

## Pre-Deployment Verification

### ✅ Code Implementation

- [x] `src/models/User.js` - Updated with bcrypt
- [x] `src/controllers/authController.js` - Created
- [x] `src/middleware/authMiddleware.js` - Created
- [x] `src/routes/userRoutes.js` - Created
- [x] `src/server.js` - Updated with routes

### ✅ Documentation

- [x] `AUTHENTICATION.md` - Complete API docs
- [x] `INTEGRATION_GUIDE.md` - Architecture & flow
- [x] `QUICKSTART.md` - Getting started guide
- [x] `IMPLEMENTATION_SUMMARY.md` - What was changed
- [x] `CLIENT_EXAMPLE.js` - Frontend examples
- [x] `.env.example` - Environment template

---

## Local Testing Checklist

### Step 1: Environment Setup

- [ ] Create `.env` file in main-server with all required variables:

  ```
  MONGODB_URI=mongodb://localhost:27017/main-server
  JWT_SECRET=your_super_secret_key_here
  PORT=5000
  FACE_SERVER_URL=http://localhost:3001
  ```

- [ ] Verify face-server `.env` is configured:
  ```
  MONGODB_URI=mongodb://localhost:27017/face-server
  PORT=3001
  ```

### Step 2: Dependencies

- [ ] Main-server has all dependencies:

  ```bash
  npm list jsonwebtoken bcryptjs
  # Should show both installed
  ```

- [ ] Face-server has required dependencies for image processing

### Step 3: Database

- [ ] MongoDB is running locally
- [ ] Two separate databases: `main-server` and `face-server`
- [ ] Databases are empty (fresh start)

### Step 4: Server Startup

- [ ] Start face-server in terminal 1:

  ```bash
  cd face-server
  npm start
  # Output: Face server running on 3001
  ```

- [ ] Start main-server in terminal 2:

  ```bash
  cd main-server
  npm start
  # Output: Main Server running on port : 5000
  ```

- [ ] Both servers show no errors in console

### Step 5: API Testing

#### Test 1: Registration

```bash
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "TestPassword123",
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Camponotus_flavomarginatus_ant.jpg/320px-Camponotus_flavomarginatus_ant.jpg"
  }'
```

- [ ] Response includes: message, token, user object
- [ ] token is a valid JWT (3 parts separated by dots)
- [ ] user object includes: id, name, email, faceProfileId
- [ ] No errors in server console

#### Test 2: Verify Face Registered

```bash
# Check face-server MongoDB
db.users.findOne({userId: "YOUR_USER_ID"})
```

- [ ] User exists in face-server database
- [ ] userId matches the MongoDB ID from main-server
- [ ] faceDescriptors array contains face embedding

#### Test 3: Login

```bash
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'
```

- [ ] Response includes: message, token, user object
- [ ] Token is valid JWT
- [ ] Same user data returned as registration

#### Test 4: Login with Wrong Password

```bash
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "WrongPassword"
  }'
```

- [ ] Returns 401 Unauthorized
- [ ] Message: "Invalid credentials"

#### Test 5: Protected Route (Get Profile)

```bash
# Replace with actual token from login
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

- [ ] Returns user profile
- [ ] Password is NOT included in response
- [ ] All user fields present except password

#### Test 6: Protected Route Without Token

```bash
curl -X GET http://localhost:5000/api/users/profile
```

- [ ] Returns 401 Unauthorized
- [ ] Message: "No token provided"

#### Test 7: Protected Route with Invalid Token

```bash
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer invalid_token"
```

- [ ] Returns 401 Unauthorized
- [ ] Message: "Invalid token"

#### Test 8: Duplicate Email Registration

```bash
# Try to register same email again
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Another User",
    "email": "test@example.com",
    "password": "AnotherPassword",
    "imageUrl": "https://..."
  }'
```

- [ ] Returns 400 Bad Request
- [ ] Message: "User already exists"

---

## Production Deployment Checklist

### Security

- [ ] JWT_SECRET is strong and random (min 32 characters)
- [ ] JWT_SECRET is NOT in version control
- [ ] All environment variables properly set
- [ ] HTTPS enabled on all servers
- [ ] CORS configured appropriately
- [ ] Rate limiting implemented (future enhancement)

### Environment

- [ ] MONGODB_URI points to production database
- [ ] FACE_SERVER_URL points to production face-server
- [ ] PORT is configured for load balancer/reverse proxy
- [ ] NODE_ENV=production set
- [ ] Error logging configured

### Database

- [ ] Backup strategy implemented
- [ ] Indexes created on email field (unique)
- [ ] MongoDB authentication enabled
- [ ] Separate databases for face-server and main-server

### Monitoring

- [ ] Error logging service configured
- [ ] Performance monitoring in place
- [ ] Uptime monitoring configured
- [ ] Alert system for failures

### Documentation

- [ ] Team trained on authentication flow
- [ ] API documentation shared with frontend team
- [ ] Deployment procedures documented
- [ ] Rollback procedures defined

---

## Troubleshooting Guide

### Issue: "Cannot find module 'jsonwebtoken'"

**Solution**:

```bash
npm install jsonwebtoken
# Verify
npm list jsonwebtoken
```

### Issue: "Cannot find module 'bcryptjs'"

**Solution**:

```bash
npm install bcryptjs
# Verify
npm list bcryptjs
```

### Issue: "Face server not reachable"

**Solution**:

- Check face-server is running on port 3001
- Verify FACE_SERVER_URL in .env
- Check network connectivity between servers

### Issue: "JWT_SECRET is not defined"

**Solution**:

- Create .env file in main-server root
- Add: `JWT_SECRET=your_secret_here`
- Restart server

### Issue: "No face detected in image"

**Solution**:

- Use a clear, front-facing face image
- Ensure image URL is publicly accessible
- Try a different image

### Issue: "Token expired immediately"

**Solution**:

- Check server system clock is correct
- Verify JWT_SECRET hasn't changed
- Tokens have 7-day expiration

### Issue: "User registration successful but face registration failed"

**Solution**:

- Check face-server logs
- Verify face-server MongoDB connection
- Check image URL accessibility
- User will be automatically deleted and must re-register

### Issue: "Password comparison always fails"

**Solution**:

- Ensure password was hashed (check DB)
- Verify bcrypt comparePassword method
- Check password field in model
- Restart server and test again

---

## Performance Benchmarks (Expected)

- Registration request: < 3 seconds (includes face detection)
- Login request: < 500ms
- Profile request: < 100ms
- JWT verification: < 10ms

If slower, check:

- Face-server CPU/memory
- MongoDB query performance
- Network latency between servers

---

## Rollback Procedure

If issues occur after deployment:

1. **Revert Code Changes**:

   ```bash
   git revert <commit-hash>
   npm install
   ```

2. **Restart Servers**:

   ```bash
   pm2 restart main-server
   pm2 restart face-server
   ```

3. **Clear Problematic Data** (if needed):

   ```bash
   # Backup first!
   db.users.deleteMany({date: {$gt: ISODate("2024-01-25")}})
   ```

4. **Verify Service**:
   - Test login endpoint
   - Check logs for errors
   - Monitor for continued issues

---

## Version Information

- Main Server Version: 1.0.0
- Face Server Version: 1.0.0
- Node.js: v14.0.0+ recommended
- MongoDB: v4.0+
- JWT: jsonwebtoken ^9.0.3
- Password Hashing: bcryptjs ^3.0.3

---

## Support & Maintenance

### Regular Maintenance Tasks

- [ ] Monitor error logs weekly
- [ ] Review authentication logs for suspicious activity
- [ ] Rotate JWT_SECRET every 90 days (plan ahead)
- [ ] Update dependencies monthly
- [ ] Backup database daily

### Monitoring Points

- [ ] Failed login attempts
- [ ] Invalid token errors
- [ ] Face detection failures
- [ ] Database connection issues
- [ ] Response times degradation

---

## Sign-Off

When all checks are complete and tested:

- [ ] Development team: ****\_\_\_**** Date: **\_**
- [ ] QA team: ****\_\_\_**** Date: **\_**
- [ ] DevOps team: ****\_\_\_**** Date: **\_**
- [ ] Product manager: ****\_\_\_**** Date: **\_**

**Approved for Production**: ******\_****** Date: **\_**
