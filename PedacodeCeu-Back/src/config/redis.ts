import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: 2,
  protocol: 2,
});

redis.on("connect", () => console.log("Redis conectado"));
redis.on("error", (err) => console.error("Erro no Redis:", err.message));

export default redis;