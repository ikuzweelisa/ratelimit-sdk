import type { KV } from "./types";

export class LocalKV implements KV {
  private readonly store: Map<string, string> = new Map();
  private readonly expirations: Map<string, NodeJS.Timeout> = new Map();
  async get(key: string): Promise<string | null> {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

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
  async incrby(key: string, increment: number): Promise<number> {
    const current = this.store.get(key) ?? "0";
    const next = parseInt(current) + increment;
    this.store.set(key, next.toString());
    return next;
  }

  async incr(key: string): Promise<number> {
    return this.incrby(key, 1);
  }

  async pexpire(key: string, milliseconds: number): Promise<number> {
    if (!this.store.has(key)) {
      return 0;
    }

    this.setExpiration(key, milliseconds);
    return 1;
  }

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

  async hmset(key: string, fields: Record<string, string>): Promise<unknown> {
    const existing = this.store.has(key)
      ? JSON.parse(this.store.get(key) || "{}")
      : {};

    this.store.set(key, JSON.stringify({ ...existing, ...fields }));
    return true;
  }

  private setExpiration(key: string, milliseconds: number): void {
    if (this.expirations.has(key)) {
      clearTimeout(this.expirations.get(key)!);
      this.expirations.delete(key);
    }

    const timeout = setTimeout(() => {
      this.store.delete(key);
      this.expirations.delete(key);
    }, milliseconds);

    this.expirations.set(key, timeout);
  }
}

export const createLocalKv = () => new LocalKV();
