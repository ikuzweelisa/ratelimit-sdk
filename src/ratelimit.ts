/**
 * This module contains the Ratelimit class.
 * @packageDocumentation
 */
import { ms } from "./internal";
import type {
  Context,
  Duration,
  RatelimitResponse,
  KV,
  Ratelimiter,
  RateLimitOptions,
} from "./types";

/**
 * Ratelimiter.
 * @param namespace {string} - The namespace of the rate limiter.
 * @param options - The configuration for the rate limiter.
 * @returns A new instance of the Ratelimit class.
 * @example
 * ```typescript
 * import { Ratelimit } from "ratelimit-sdk";
 * import Redis from "ioredis";
 *
 * const redisClient = new Redis("redis://localhost:6379");
 *
 * const ratelimiter = new Ratelimit("api", {
 *   kv: redisClient,
 *   limiter: Ratelimit.slidingWindow(50, "10s"), // 50 requests per 10 seconds
 * });
 * ```
 */
export class Ratelimit<T extends KV> {
  private readonly kv: T;
  private readonly limiter: Ratelimiter;
  private readonly namespace: string;

  constructor(namespace: string, options: RateLimitOptions<T>) {
    this.kv = options.kv;
    this.limiter = options.limiter;
    this.namespace = namespace;
  }
  /**
   * Limit the request.
   * @param identifier - The identifier of the request like user id, ip address, etc.
   * @returns The response from the rate limiter.
   * @example
   * ```typescript
   *   const userId = "user-123";
   *   const result = await ratelimiter.limit(userId);
   * ```
   */
  public limit = async (identifier: string): Promise<RatelimitResponse> => {
    return await this.limiter(
      { kv: this.kv, namespace: this.namespace },
      identifier
    );
  };

  /**
   * Fixed window rate limiter.
   * @param tokens - The number of tokens to limit the request.
   * @param window - The window duration.
   * @see https://smudge.ai/blog/ratelimit-algorithms
   * @returns The rate limiter function.
   */
  static fixedWindow(tokens: number, window: Duration): Ratelimiter {
    const windowDuration = ms(window);
    return async function (ctx: Context, identifier: string) {
      const now = Date.now();
      const bucket = Math.floor(now / windowDuration);
      const key = [ctx.namespace, identifier, bucket].join(":");
      const current = await ctx.kv.incr(key);
      if (current === 1) {
        await ctx.kv.pexpire(key, windowDuration);
      }
      const success = current <= tokens;
      const remaining = Math.max(0, tokens - current);
      const reset = (bucket + 1) * windowDuration;
      return {
        success,
        limit: tokens,
        remaining,
        reset,
      };
    };
  }
  /**
   * Sliding window rate limiter.
   * @param tokens - The number of tokens to limit the request.
   * @param window - The window duration.
   * @see https://smudge.ai/blog/ratelimit-algorithms
   * @returns The rate limiter function.
   */
  static slidingWindow(tokens: number, window: Duration): Ratelimiter {
    const windowDuration = ms(window);
    return async function (ctx: Context, identifier: string) {
      const now = Date.now();
      const currentWindow = Math.floor(now / windowDuration);
      const previousWindow = currentWindow - 1;
      const currentBucket = [ctx.namespace, identifier, currentWindow].join(
        ":"
      );
      const previousBucket = [ctx.namespace, identifier, previousWindow].join(
        ":"
      );
      const current = await ctx.kv.incr(currentBucket);
      if (current === 1) {
        await ctx.kv.pexpire(currentBucket, windowDuration);
      }
      const previousCount = await ctx.kv
        .get(previousBucket)
        .then((v) => parseInt(v ?? "0"));
      const percentage = (now % windowDuration) / windowDuration;
      const average = previousCount * (1 - percentage) + current;
      if (average > tokens) {
        return {
          success: false,
          limit: tokens,
          remaining: 0,
          reset: (currentWindow + 1) * windowDuration,
        };
      }
      const remaining = Number((tokens - average).toFixed(1));
      return {
        success: true,
        limit: tokens,
        remaining: Math.max(0, remaining),
        reset: (currentWindow + 1) * windowDuration,
      };
    };
  }
  /**
   * Token bucket rate limiter.
   * @param refillRate The rate at which tokens are refilled.
   * @param refillInterval The interval at which tokens are refilled.
   * @param maxTokens The maximum number of tokens.
   * @returns The rate limiter function.
   */
  static tokenBucket(
    refillRate: number,
    refillInterval: Duration,
    maxTokens: number
  ): Ratelimiter {
    const refillDuration = ms(refillInterval);
    return async function (ctx: Context, identifier: string) {
      const now = Date.now();
      const key = [ctx.namespace, identifier, "bucket"].join(":");
      const current = await ctx.kv.hmget(key, "tokens", "lastRefill");
      const tokens = current[0] ? parseInt(current[0]) : maxTokens;
      const lastRefill = current[1] ? parseInt(current[1]) : now;
      const timeSinceLastRefill = now - lastRefill;
      const tokensToAdd =
        Math.floor(timeSinceLastRefill / refillDuration) * refillRate;
      const newTokens = Math.min(maxTokens, tokens + tokensToAdd);
      const success = newTokens >= 1;
      const tokensToSet = success ? newTokens - 1 : newTokens;
      const refillDate = tokensToAdd > 0 ? now : lastRefill;
      await ctx.kv.hmset(key, {
        tokens: tokensToSet.toString(),
        lastRefill: refillDate.toString(),
      });
      await ctx.kv.pexpire(key, refillDuration * 2);
      const remaining = Math.max(0, tokensToSet);
      const reset = refillDate + refillDuration;

      return {
        success,
        limit: maxTokens,
        remaining,
        reset,
      };
    };
  }
}
