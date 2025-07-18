export type KV = {
  get(key: string, ...args: any[]): Promise<string | null>;
  set(key: string, value: string, ...args: any[]): Promise<unknown>;
  incrby(key: string, increment: number, ...args: any[]): Promise<number>;
  incr(key: string, ...args: any[]): Promise<number>;
  pexpire(key: string, milliseconds: number, ...args: any[]): Promise<number>;
};

export interface Context {
  kv: KV;
  name: string;
}

export type RatelimitResponse = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  pending?: Promise<void>;
};

export type Ratelimiter = (
  ctx: Context,
  identifier: string
) => Promise<RatelimitResponse>;

export interface RateLimitOptions<T extends KV> {
  kv: T;
  limiter: Ratelimiter;
}

export type Unit = "ms" | "s" | "m" | "h" | "d";
export type Duration =`${number} ${Unit}`;
