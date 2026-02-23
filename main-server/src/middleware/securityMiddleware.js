const createInMemoryRateLimiter = ({ windowMs, max, message }) => {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket?.remoteAddress || "unknown";
    const state = hits.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > state.resetAt) {
      state.count = 0;
      state.resetAt = now + windowMs;
    }

    state.count += 1;
    hits.set(key, state);

    if (state.count > max) {
      return res.status(429).json({ message });
    }

    return next();
  };
};

const generalRateLimiter = createInMemoryRateLimiter({
  windowMs: 60 * 1000,
  max: 300,
  message: "Too many requests. Please try again shortly."
});

const authRateLimiter = createInMemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many authentication attempts. Please wait and try again."
});

const secureHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
};

module.exports = {
  generalRateLimiter,
  authRateLimiter,
  secureHeaders
};
