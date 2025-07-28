/**
 * This module contains utility functions like a local KV store.
 * @example
 * ```typescript
 * import { createLocalKv } from "ratelimit-sdk/utils";
 * 
 * async function main() {
 *   const kv = createLocalKv();
 *   await kv.set("key", "value");
 *   const value = await kv.get("key");
 *   console.log(value);
 * }
 * 
 * void main();
 * ```
 * @packageDocumentation
 */

import type { KV } from "./types";

type Timeout = ReturnType<typeof setTimeout>;

/**
 * A Simple Local KV Store.
 * @example
 * ```typescript
 * async function main() {
 *   const kv = new LocalKV();
 *   await kv.set("key", "value");
 *   const value = await kv.get("key");
 *   console.log(value);
 * }
 * 
 * void main();
 * ```
 */
export class LocalKV implements KV {
  private readonly store: Map<string, string> = new Map();
  private readonly expirations: Map<string, Timeout> = new Map();
  async get(key: string): Promise<string | null> {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  /**
   * Set the value of a key.
   * @param key - The key to set.
   * @param value - The value to set.
   * @param options - The options for the key.
   * @returns The result of the operation.
   */
  async set(
    key: string,
    value: string,
    options?: { px?: number }
  ): Promise<unknown> {
    this.store.set(key, value);
    if (options?.px) {
      this.setExpiration(key, options.px);
    }

    return true;
  }
  /**
   * Increment the value of a key by a given amount.
   * @param key - The key to increment.
   * @param increment - The amount to increment.
   * @returns The result of the operation.
   */
  async incrby(key: string, increment: number): Promise<number> {
    const current = this.store.get(key) ?? "0";
    const next = parseInt(current) + increment;
    this.store.set(key, next.toString());
    return next;
  }

  /**
   * Increment the value of a key by 1.
   * @param key - The key to increment.
   * @returns The result of the operation.
   */
  async incr(key: string): Promise<number> {
    return this.incrby(key, 1);
  }

  /**
   * Set the expiration time of a key in milliseconds.
   * @param key - The key to set the expiration time for.
   * @param milliseconds - The expiration time in milliseconds.
   * @returns The result of the operation.
   */
  async pexpire(key: string, milliseconds: number): Promise<number> {
    if (!this.store.has(key)) {
      return 0;
    }

    this.setExpiration(key, milliseconds);
    return 1;
  }

  /**
   * Get the values of multiple fields from a hash.
   * @param key - The key of the hash.
   * @param fields - The fields to get.
   * @returns The values of the fields.
   */
  async hmget(key: string, fields: string[]): Promise<string[]> {
    if (!this.store.has(key)) {
      return fields.map(() => "");
    }

    try {
      const data = JSON.parse(this.store.get(key) || "{}");
      return fields.map((field) =>
        data[field] !== undefined ? String(data[field]) : ""
      );
    } catch {
      return fields.map(() => "");
    }
  }

  /**
   * Set the values of multiple fields in a hash.
   * @param key - The key of the hash.
   * @param fields - The fields to set.
   * @returns The result of the operation.
   */
  async hmset(key: string, fields: Record<string, string>): Promise<unknown> {
    const existing = this.store.has(key)
      ? JSON.parse(this.store.get(key) || "{}")
      : {};

    this.store.set(key, JSON.stringify({ ...existing, ...fields }));
    return true;
  }

  /**
   * Set the expiration time of a key in milliseconds.
   * @param key - The key to set the expiration time for.
   * @param milliseconds - The expiration time in milliseconds.
   * @returns The result of the operation.
   */
  private setExpiration(key: string, milliseconds: number): void {
    if (this.expirations.has(key)) {
      clearTimeout(this.expirations.get(key)!);
      this.expirations.delete(key);
    }

    const timeout: Timeout = setTimeout(() => {
      this.store.delete(key);
      this.expirations.delete(key);
    }, milliseconds);

    this.expirations.set(key, timeout);
  }
}

/**
 * Create a new local KV store.
 * @returns A new instance of the LocalKV class.
 */
export const createLocalKv: () => LocalKV = () => new LocalKV();
