/**
 * This module contains the types for the ratelimit-sdk.
 * @packageDocumentation
 */

/**
 * Any  Key-Value store.
 */
export interface KV  {
  /**
   * Get the value associated with a key.
   * Returns the value as a string, or null if the key does not exist.
   * @param key The key to retrieve.
   */
  get(key: string, ...args: any[]): Promise<string | null>;

  /**
   * Set the value of a key.
   * @param key The key to set.
   * @param value The value to store.
   */
  set(key: string, value: string, ...args: any[]): Promise<unknown>;

  /**
   * Increment the numeric value of a key by a given amount.
   * @param key The key to increment.
   * @param increment The amount to add to the value.
   * @returns The new value after the increment.
   */
  incrby(key: string, increment: number, ...args: any[]): Promise<number>;

  /**
   * Increment the numeric value of a key by 1.
   * @param key The key to increment.
   * @returns The new value after the increment.
   */
  incr(key: string, ...args: any[]): Promise<number>;

  /**
   * Set a timeout on a key in milliseconds.
   * @param key The key to set the expiration on.
   * @param milliseconds The expiration time in milliseconds.
   * @returns 1 if the timeout was set, 0 otherwise.
   */
  pexpire(key: string, milliseconds: number, ...args: any[]): Promise<number>;
  
  /**
   * Get the values of multiple fields within a hash stored at a key.
   * @param key The key of the hash.
   * @param fields The fields to retrieve.
   * @returns An array of string values for the fields. If a field does not exist,
   * its corresponding value in the array will be null.
   */
  hmget(key: string, ...fields: string[]): Promise<(string | null)[]>;

  /**
   * Set multiple fields and their values within a hash stored at a key.
   * @param key The key of the hash.
   * @param fields An object containing the field-value pairs to set.
   */
  hmset(key: string, fields: Record<string, string>): Promise<unknown>;

    /**
   * Delete one or more keys.
   * @param keys The keys to delete.
   * @returns The number of keys that were removed.
   */
    del(key: string, ...keys: string[]): Promise<number>;
};

/**
 * The context of the rate limiter.
 */
export interface Context {
  kv: KV;
  namespace: string;
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
   * A Persistent  key-value store.
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
