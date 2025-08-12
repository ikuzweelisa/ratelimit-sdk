/**
 * This module contains the types for the ratelimit-sdk.
 * @packageDocumentation
 */

/**
 * Any  Key-Value store.
 */
export type KV = {
  /**
   * Get the value of a key.
   */
  get(key: string, ...args: any[]): Promise<string | null>;
  /**
   * Set the value of a key.
   */
  set(key: string, value: string, ...args: any[]): Promise<unknown>;
  /**
   * Increment the value of a key by a given amount.
   */
  incrby(key: string, increment: number, ...args: any[]): Promise<number>;
  /**
   * Increment the value of a key by 1.
   */
  incr(key: string, ...args: any[]): Promise<number>;
  /**
   * Set the expiration time of a key in milliseconds.
   */
  pexpire(key: string, milliseconds: number, ...args: any[]): Promise<number>;
};

/**
 * The context of the rate limiter.
 */
export interface Context {
  kv: KV;
  name: string;
}

/**
 * The response from the rate limiter.
 */
export type RatelimitResponse = {
  /**
   * Whether the request was successful.
   */
  success: boolean;
  /**
   * The limit of the rate limiter.
   */
  limit: number;
  /**
   * The remaining requests in the current window.
   */
  remaining: number;
  /**
   * The time in milliseconds when the rate limit will reset.
   */
  reset: number;
  /**
   * The pending promise if the request is pending.
   */
  pending?: Promise<void>;
};

/**
 * The rate limiter function.
 */
export type Ratelimiter = (
  ctx: Context,
  identifier: string
) => Promise<RatelimitResponse>;

/**
 * The options for the rate limiter.
 */
export interface RateLimitOptions<T extends KV> {
  /**
   * Any  key-value store to use for the rate limiter.
   */
  kv: T;
  /**
   * The rate limiter function to use for the rate limiter.
   */
  limiter: Ratelimiter;
}

type Days = "days" | "day" | "d";
type Hours = "hours" | "hour" | "hrs" | "hr" | "h";
type Minutes = "minutes" | "minute" | "mins" | "min" | "m";
type Seconds = "seconds" | "second" | "secs" | "sec" | "s";
type Milliseconds = "milliseconds" | "millisecond" | "ms";

/**
 * The unit of the duration.
 */
export type Unit = Days | Hours | Minutes | Seconds | Milliseconds;

/**
 * The duration of the window.
 */
export type Duration = `${number}${Unit}`;
