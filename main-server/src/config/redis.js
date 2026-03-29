const redisUrl = process.env.REDIS_URL;

let redisConnectionOptions;

if (redisUrl) {
    const parsed = new URL(redisUrl);

    const dbFromPath = parsed.pathname && parsed.pathname !== "/"
        ? Number(parsed.pathname.replace("/", ""))
        : 0;

    redisConnectionOptions = {
        host: parsed.hostname,
        port: Number(parsed.port || 6379),
        db: Number.isNaN(dbFromPath) ? 0 : dbFromPath,
        // Do not auto-trust URL username because many providers expose URL-like values
        // that are not ACL usernames. Use REDIS_USERNAME only when explicitly required.
        username: process.env.REDIS_USERNAME || undefined,
        password: process.env.REDIS_PASSWORD || parsed.password || undefined,
        maxRetriesPerRequest: null
    };
} else {
    const redisHost = process.env.REDIS_HOST || "127.0.0.1";
    const redisPort = Number(process.env.REDIS_PORT || 6379);
    const redisDb = Number(process.env.REDIS_DB || 0);
    const redisPassword = process.env.REDIS_PASSWORD || undefined;
    const redisUsername = process.env.REDIS_USERNAME || undefined;

    redisConnectionOptions = {
        host: redisHost,
        port: redisPort,
        db: redisDb,
        username: redisUsername,
        password: redisPassword,
        maxRetriesPerRequest: null
    };
}

module.exports = {
    redisConnectionOptions
};
