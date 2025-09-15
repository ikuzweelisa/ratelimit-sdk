import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { createLocalKv, LocalKV } from "../utils";
import { Ratelimit } from "../ratelimit";
import { ms } from "../internal";

let localKV: LocalKV;

beforeEach(() => {
  localKV = createLocalKv();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  localKV.clear();
});

describe("fixed-window", () => {
  it("should allow requests within the limit", async () => {
    const limiter = new Ratelimit("test", {
      kv: localKV,
      limiter: Ratelimit.fixedWindow(5, "10s"),
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
      limiter: Ratelimit.fixedWindow(3, "10s"),
    });
    for (let i = 0; i < 3; i++) {
      await limiter.limit("user2");
    }
    const result = await limiter.limit("user2");
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.limit).toBe(3);
  });

  it("should reset tokens after the window duration", async () => {
    const limiter = new Ratelimit("test", {
      kv: localKV,
      limiter: Ratelimit.fixedWindow(2, "10s"),
    });

    await limiter.limit("user3");
    const result1 = await limiter.limit("user3");

    expect(result1.success).toBe(true);
    expect(result1.remaining).toBe(0);

    const result2 = await limiter.limit("user3");
    expect(result2.success).toBe(false);

    vi.advanceTimersByTime(ms("10s"));

    const result3 = await limiter.limit("user3");
    expect(result3.success).toBe(true);
    expect(result3.remaining).toBe(1);
  });

  it("should track different identifiers separately", async () => {
    const limiter = new Ratelimit("test", {
      kv: localKV,
      limiter: Ratelimit.fixedWindow(2, "10s"),
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
      limiter: Ratelimit.fixedWindow(1, "10s"),
    });

    const relaxedLimiter = new Ratelimit("relaxed", {
      kv: localKV,
      limiter: Ratelimit.fixedWindow(5, "10s"),
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
      limiter: Ratelimit.fixedWindow(3, "10s"),
    });

    const result = await limiter.limit("user");

    const expectedResetTime =
      Math.floor(now / ms("10s")) * ms("10s") + ms("10s");
    expect(result.reset).toBe(expectedResetTime);
  });
});

describe("sliding-window", () => {
  it("should allow requests within the limit", async () => {
    const limiter = new Ratelimit("test", {
      kv: localKV,
      limiter: Ratelimit.slidingWindow(5, "10s"),
    });

    const result1 = await limiter.limit("user1");
    const result2 = await limiter.limit("user1");
    const result3 = await limiter.limit("user1");

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result3.success).toBe(true);
  });

  it("should block requests that exceed the limit", async () => {
    const limiter = new Ratelimit("test", {
      kv: localKV,
      limiter: Ratelimit.slidingWindow(2, "10s"),
    });
    await limiter.limit("user2");
    await limiter.limit("user2");
    const result = await limiter.limit("user2");
    expect(result.success).toBe(false);
  });

  it("should allow requests after the window slides", async () => {
    const limiter = new Ratelimit("test", {
      kv: localKV,
      limiter: Ratelimit.slidingWindow(2, "10s"),
    });
    await limiter.limit("user3");
    await limiter.limit("user3");
    const result1 = await limiter.limit("user3");
    expect(result1.success).toBe(false);
    vi.advanceTimersByTime(ms("10s"));
    const result2 = await limiter.limit("user3");
    expect(result2.success).toBe(true);
  });

  it("should calculate the correct reset time", async () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const limiter = new Ratelimit("test", {
      kv: localKV,
      limiter: Ratelimit.slidingWindow(3, "10s"),
    });
    const result = await limiter.limit("user");
    const expectedResetTime =
      Math.floor(now / ms("10s")) * ms("10s") + ms("10s");
    expect(result.reset).toBe(expectedResetTime);
  });
});

describe("token-bucket", () => {
  it("should allow requests when tokens are available", async () => {
    const limiter = new Ratelimit("test", {
      kv: localKV,
      limiter: Ratelimit.tokenBucket(1, "10s", 5),
    });

    const result = await limiter.limit("user1");
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("should block requests when no tokens are available", async () => {
    const limiter = new Ratelimit("test", {
      kv: localKV,
      limiter: Ratelimit.tokenBucket(1, "10s", 1),
    });
    await limiter.limit("user2");
    const result = await limiter.limit("user2");
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should refill tokens over time", async () => {
    const limiter = new Ratelimit("test", {
      kv: localKV,
      limiter: Ratelimit.tokenBucket(1, "10s", 2),
    });
    await limiter.limit("user3");
    await limiter.limit("user3");
    const result1 = await limiter.limit("user3");
    expect(result1.success).toBe(false);

    vi.advanceTimersByTime(ms("10s"));

    const result2 = await limiter.limit("user3");
    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(0);

    vi.advanceTimersByTime(ms("10s"));
    const result3 = await limiter.limit("user3");
    expect(result3.success).toBe(true);
    expect(result3.remaining).toBe(0);
  });

  it("should not exceed the maximum number of tokens", async () => {
    const limiter = new Ratelimit("test", {
      kv: localKV,
      limiter: Ratelimit.tokenBucket(1, "10s", 5),
    });
    vi.advanceTimersByTime(ms("100s"));
    const result = await limiter.limit("user4");
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("should calculate the correct reset time", async () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const limiter = new Ratelimit("test", {
      kv: localKV,
      limiter: Ratelimit.tokenBucket(1, "10s", 5),
    });
    for (let i = 0; i < 5; i++) {
      await limiter.limit("user5");
    }
    const result = await limiter.limit("user5");
    expect(result.success).toBe(false);
    expect(result.reset).toBe(now + ms("10s"));
  });

  it("should handle refills correctly", async () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const limiter = new Ratelimit("test-refills", {
      kv: localKV,
      limiter: Ratelimit.tokenBucket(5, "10s", 5),
    });
    for (let i = 0; i < 5; i++) {
      await limiter.limit("user6");
    }
    vi.advanceTimersByTime(ms("10s"));
    const result2 = await limiter.limit("user6");
    expect(result2.remaining).toBe(4);
  });
});
