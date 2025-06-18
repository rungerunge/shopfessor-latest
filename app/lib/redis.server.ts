import { Redis } from "ioredis";

let redis: Redis;

declare global {
  var __redis: Redis | undefined;
}

if (process.env.NODE_ENV === "production") {
  redis = new Redis(process.env.REDIS_URL!);
} else {
  if (!global.__redis) {
    global.__redis = new Redis(process.env.REDIS_URL!);
  }
  redis = global.__redis;
}

export { redis };
