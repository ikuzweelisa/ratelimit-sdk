/**
 * This module contains the Ratelimit class.
 * @example
 * ```typescript
 * import { Ratelimit } from "ratelimit-sdk";
 * 
 * async function main() {
 *   const ratelimiter = new Ratelimit("api", {
 *     kv: redisClient,
 *     limiter: Ratelimit.fixedWindow(50, "10 s"), // 50 requests per 10 seconds
 *   });
 *   const userId = "user-123";
 *   const result = await ratelimiter.limit(userId);
 *   console.log(result);
 * }
 * 
 * void main();
 * ```
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
 * @param name - The name of the rate limiter.
 * @param config - The configuration for the rate limiter.
 * @returns A new instance of the Ratelimit class.
 * @example
 * ```typescript
 * import { Ratelimit } from "ratelimit-js";
 * import Redis from "ioredis";
 *
 * const redisClient = new Redis("redis://localhost:6379");
 *
 * const ratelimiter = new Ratelimit("api", {
 *   kv: redisClient,
 *   limiter: Ratelimit.fixedWindow(50, "10 s"), // 50 requests per 10 seconds
 * });
 * ```
 */
export class Ratelimit<T extends KV> {
  private readonly kv: T;
  private readonly limiter: Ratelimiter;
  private readonly name: string;

  constructor(name: string, config: RateLimitOptions<T>) {
    this.kv = config.kv;
    this.limiter = config.limiter;
    this.name = name;
  }
  /**
   * Limit the request.
   * @param identifier - The identifier of the request like user id, ip address, etc.
   * @returns The response from the rate limiter.
   * @example
   * ```typescript
   * async function main() {
   *   const ratelimiter = new Ratelimit("api", {
   *     kv: redisClient,
   *     limiter: Ratelimit.fixedWindow(50, "10 s"), // 50 requests per 10 seconds
   *   });
   *   const userId = "user-123";
   *   const result = await ratelimiter.limit(userId);
   * }
   * 
   * void main();
   * ```
   */
  public limit = async (identifier: string): Promise<RatelimitResponse> => {
    return await this.limiter({ kv: this.kv, name: this.name }, identifier);
  };

  /**
   * Fixed window rate limiter.
   * @param tokens - The number of tokens to limit the request.
   * @param window - The window duration.
   * @link https://smudge.ai/blog/ratelimit-algorithms
   * @returns The rate limiter function.
   */
  static fixedWindow(tokens: number, window: Duration): Ratelimiter {
    const windowDuration = ms(window);
    return async function (ctx: Context, identifier: string) {
      const now = Date.now();
      const bucket = Math.floor(now / windowDuration);
      const key = [ctx.name, identifier, bucket].join(":");
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
}
