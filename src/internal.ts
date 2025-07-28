/**
 * This module contains internal functions for the ratelimit-sdk.
 * @packageDocumentation
 */
import type { Duration, Unit } from "./types";

export function ms(d: Duration): number {
  const [timeString, unit] = d.split(" ") as [string, Unit];
  const time = parseFloat(timeString);
  switch (unit) {
    case "ms":
      return time;
    case "s":
      return time * 1000;
    case "m":
      return time * 1000 * 60;
    case "h":
      return time * 1000 * 60 * 60;
    case "d":
      return time * 1000 * 60 * 60 * 24;
    default:
      throw new Error(`Unable to parse window size: ${d}`);
  }
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
