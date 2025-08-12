# ratelimit-sdk

A Minimal and Flexible Rate Limiter for JavaScript/TypeScript applications.

[![npm (scoped)](https://img.shields.io/npm/v/ratelimit-sdk)](https://www.npmjs.com/package/ratelimit-sdk)

## Installation

```bash
pnpm add ratelimit-sdk
```

## Usage

> BYOK(Bring Your Own Key-Value Store) [Redis](https://redis.io/),[Valkey](https://valkey.io/),[Upstash](https://upstash.com/),memory,etc.

#### Using ioredis or iovalkey

```typescript
import { Ratelimit } from "ratelimit-sdk";
import Redis from "ioredis";

const redisClient = new Redis("redis://localhost:6379");

const ratelimiter = new Ratelimit("api", {
  kv: redisClient,
  limiter: Ratelimit.fixedWindow(50, "10s"), // 50 requests per 10 seconds
});

// Use the rate limiter
const result = await ratelimiter.limit("user-123");
```

#### Using node-redis

```typescript
import { Ratelimit } from "ratelimit-sdk";
import { createClient } from "redis";

const redisClient = createClient({
  url: "redis://localhost:6379",
});
await redisClient.connect();

const ratelimiter = new Ratelimit("api", {
  kv: redisClient,
  limiter: Ratelimit.fixedWindow(100, "1m"), // 100 requests per minute
});

// Use the rate limiter
const userId = "user-123";
const result = await ratelimiter.limit(userId);
console.log(result);
```

#### Using Upstash Redis

```typescript
import { Ratelimit } from "ratelimit-sdk";
import { Redis } from "@upstash/redis";

const ratelimiter = new Ratelimit("api-ratelimiter", {
  kv: Redis.fromEnv(),
  limiter: Ratelimit.fixedWindow(50, "10s"), // 50 requests per 10 seconds
});

const userId = "user-123";
const result = await ratelimiter.limit(userId);
console.log(result);
```

#### Using Memory

```typescript
import { Ratelimit } from "ratelimit-sdk";
import { createLocalKv } from "ratelimit-sdk/utils";

const localKV = createLocalKv();

const ratelimiter = new Ratelimit("api-ratelimiter", {
  kv: localKV,
  limiter: Ratelimit.fixedWindow(5, "1m"),
});

// Use the rate limiter
const userId = "user-123";
const result = await ratelimiter.limit(userId);
console.log(result);
```

> The local KV store is not persistent and keeps data in memory only. It is not suitable for serverless functions or any environment where your application might restart frequently. Use Redis or another persistent store for production environments.

## Important Resources

- [Theo's Video on Rate Limiting](https://www.youtube.com/watch?v=8QyygfIloMc).
- [Visualizing Rate Limiting Algorithms](https://smudge.ai/blog/ratelimit-algorithms)

## License

MIT [license](https://github.com/ikuzweelisa/ratelimit-sdk)
