import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import type { KV } from "../types";
import { createLocalKv } from "../utils";
import { Ratelimit } from "../ratelimit";

let localKV: KV;

beforeEach(() => {
  localKV = createLocalKv();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ratelimit-fixed-window", () => {
  it("should allow requests within the limit", async () => {
    const limiter = new Ratelimit("test", {
      kv: localKV,
      limiter: Ratelimit.fixedWindow(5, "10 s"),
    });

    const result1 = await limiter.limit("user1");
    const result2 = await limiter.limit("user1");
    const result3 = await limiter.limit("user1");

    expect(result1.success).toBe(true);
    expect(result1.remaining).toBe(4);
    expect(result1.limit).toBe(5);

    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(3);
    expect(result3.success).toBe(true);
    expect(result3.remaining).toBe(2);
  });

  it("should block requests that exceed the limit", async () => {
    const limiter = new Ratelimit("test", {
      kv: localKV,
      limiter: Ratelimit.fixedWindow(3, "10 s"),
    });
    await limiter.limit("user2");
    await limiter.limit("user2");
    await limiter.limit("user2");
    const result = await limiter.limit("user2");

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.limit).toBe(3);
  });

  it("should reset tokens after the window duration", async () => {
    const limiter = new Ratelimit("test", {
      kv: localKV,
      limiter: Ratelimit.fixedWindow(2, "10 s"),
    });

    await limiter.limit("user3");
    const result1 = await limiter.limit("user3");

    expect(result1.success).toBe(true);
    expect(result1.remaining).toBe(0);

    const result2 = await limiter.limit("user3");
    expect(result2.success).toBe(false);

    vi.advanceTimersByTime(10000);

    const result3 = await limiter.limit("user3");
    expect(result3.success).toBe(true);
    expect(result3.remaining).toBe(1);
  });

  it("should track different identifiers separately", async () => {
    const limiter = new Ratelimit("test", {
      kv: localKV,
      limiter: Ratelimit.fixedWindow(2, "10 s"),
    });

    await limiter.limit("user4");
    await limiter.limit("user4");

    const result1 = await limiter.limit("user4");
    expect(result1.success).toBe(false);

    const result2 = await limiter.limit("user5");
    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(1);
  });

  it("should handle multiple rate limiters with different configurations", async () => {
    const strictLimiter = new Ratelimit("strict", {
      kv: localKV,
      limiter: Ratelimit.fixedWindow(1, "10 s"),
    });

    const relaxedLimiter = new Ratelimit("relaxed", {
      kv: localKV,
      limiter: Ratelimit.fixedWindow(5, "10 s"),
    });

    await strictLimiter.limit("user");
    const strictResult = await strictLimiter.limit("user");
    expect(strictResult.success).toBe(false);

    const relaxedResult = await relaxedLimiter.limit("user");
    expect(relaxedResult.success).toBe(true);
    expect(relaxedResult.remaining).toBe(4);
  });

  it("should calculate the correct reset time", async () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const limiter = new Ratelimit("test", {
      kv: localKV,
      limiter: Ratelimit.fixedWindow(3, "10 s"),
    });

    const result = await limiter.limit("user");

    const expectedResetTime = Math.floor(now / 10000) * 10000 + 10000;
    expect(result.reset).toBe(expectedResetTime);
  });
});
