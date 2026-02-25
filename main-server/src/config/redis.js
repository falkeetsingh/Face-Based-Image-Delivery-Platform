const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = Number(process.env.REDIS_PORT || 6379);
const redisDb = Number(process.env.REDIS_DB || 0);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

const redisConnectionOptions = {
    host: redisHost,
    port: redisPort,
    db: redisDb,
    password: redisPassword,
    maxRetriesPerRequest: null
};

module.exports = {
    redisConnectionOptions
};
