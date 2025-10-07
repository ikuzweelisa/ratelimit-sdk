import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { createLocalKv, type LocalKV } from "../utils";
import { ms } from "../internal";

describe("LocalKV", () => {
  let kv: LocalKV;

  beforeEach(() => {
    vi.useFakeTimers();
    kv = createLocalKv();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    kv.clear();
  });

  it("should store and retrieve values", async () => {
    await kv.set("key1", "value1");
    const value = await kv.get("key1");
    expect(value).toBe("value1");
  });

  it("should return null for non-existent keys", async () => {
    const value = await kv.get("nonexistent");
    expect(value).toBeNull();
  });

  it("should handle key expiration", async () => {
    await kv.set("expiring", "value", { px: ms("1s") });
    expect(await kv.get("expiring")).toBe("value");
    vi.advanceTimersByTime(ms("500ms"));
    expect(await kv.get("expiring")).toBe("value");
    vi.advanceTimersByTime(ms("600ms"));
    expect(await kv.get("expiring")).toBeNull();
  });

  it("should handle pexpire method", async () => {
    await kv.set("key2", "value2");
    await kv.pexpire("key2", ms("1s"));

    expect(await kv.get("key2")).toBe("value2");

    vi.advanceTimersByTime(ms("1.1s"));
    expect(await kv.get("key2")).toBeNull();
  });

  it("should handle incr method", async () => {
    const result1 = await kv.incr("counter");
    expect(result1).toBe(1);
    const result2 = await kv.incr("counter");
    expect(result2).toBe(2);
  });

  it("should handle incrby method", async () => {
    const result1 = await kv.incrby("counter2", 5);
    expect(result1).toBe(5);
    const result2 = await kv.incrby("counter2", 3);
    expect(result2).toBe(8);
  });

  it("should handle hmset and hmget methods", async () => {
    await kv.hmset("hash1", { field1: "value1", field2: "value2" });

    const values = await kv.hmget("hash1", "field1", "field2", "nonexistent");
    expect(values).toEqual(["value1", "value2", ""]);
  });

  it("should update existing hash fields with hmset", async () => {
    await kv.hmset("hash2", { field1: "original", field2: "original" });
    await kv.hmset("hash2", { field1: "updated" });
    const values = await kv.hmget("hash2", "field1", "field2");
    expect(values).toEqual(["updated", "original"]);
  });

  it("should reset expiration when updating a key", async () => {
    await kv.set("key3", "original", { px: ms("1s") });
    vi.advanceTimersByTime(ms("500ms"));
    await kv.set("key3", "updated", { px: ms("2s") });
    vi.advanceTimersByTime(ms("1s"));
    expect(await kv.get("key3")).toBe("updated");
    vi.advanceTimersByTime(ms("1.1s"));
    expect(await kv.get("key3")).toBeNull();
  });

  it("should handle key deletion",async ()=>{
    const key = "key4";
    await kv.set(key,"value");
    await kv.del(key);
    expect(await kv.get(key)).toBeNull();
  })
});
