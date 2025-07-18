import { ms } from "./internal";
import type {
  Context,
  Duration,
  RatelimitResponse,
  KV,
  Ratelimiter,
  RateLimitOptions,
} from "./types";

export class Ratelimit<T extends KV> {
  private readonly kv: T;
  private readonly limiter: Ratelimiter;
  private readonly name: string;

  constructor(name: string, config: RateLimitOptions<T>) {
    this.kv = config.kv;
    this.limiter = config.limiter;
    this.name = name;
  }

  public limit = async (identifier: string): Promise<RatelimitResponse> => {
    return await this.limiter({ kv: this.kv, name: this.name }, identifier);
  };
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
