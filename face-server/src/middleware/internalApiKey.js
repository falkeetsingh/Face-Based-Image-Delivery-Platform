const verifyInternalApiKey = (req, res, next) => {
  const configuredKey = process.env.INTERNAL_API_KEY;

  if (!configuredKey) {
    return next();
  }

  const incomingKey = req.get("x-internal-key");
  if (!incomingKey || incomingKey !== configuredKey) {
    return res.status(403).json({ message: "Forbidden" });
  }

  return next();
};

module.exports = verifyInternalApiKey;
