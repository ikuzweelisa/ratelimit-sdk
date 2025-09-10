/**
 * This module contains internal functions for the ratelimit-sdk.
 * @packageDocumentation
 */
import type { Duration, Unit } from "./types";

const s = 1000;
const m = s * 60;
const h = m * 60;
const d = h * 24;

/**
 * Convert a duration string to milliseconds.
 * @param duration - The duration string to convert.
 * @returns The duration in milliseconds.
 */
export function ms(duration: Duration): number {
  if (typeof duration !== "string" || duration.length === 0) {
    throw new Error(`Invalid duration provided: ${JSON.stringify(duration)}`);
  }
  const input = duration.trim();
  const match =
    /^(?<value>-?(?:\d+(?:\.\d+)?|\.\d+))\s*(?<unit>milliseconds?|msecs?|msec|ms|seconds?|secs?|sec|s|minutes?|mins?|min|m|hours?|hrs?|hr|h|days?|day|d)?$/i.exec(
      input
    );
  if (!match?.groups?.value) return NaN;
  const { value, unit: rawUnit } = match.groups as {
    value: string;
    unit?: string;
  };

  const time = Number.parseFloat(value);
  const unit = rawUnit?.toLowerCase() as Unit | undefined;
  switch (unit) {
    case "millisecond":
    case "milliseconds":
    case "ms":
      return time;
    case "s":
    case "second":
    case "seconds":
    case "secs":
    case "sec":
      return s * time;
    case "m":
    case "minute":
    case "minutes":
    case "mins":
    case "min":
      return m * time;
    case "h":
    case "hour":
    case "hours":
    case "hrs":
    case "hr":
      return h * time;
    case "d":
    case "day":
    case "days":
      return d * time;
    default:
      throw new Error(`Unable to parse duration ${JSON.stringify(duration)}`);
  }
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
