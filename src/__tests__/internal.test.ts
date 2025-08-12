import { describe, expect, it } from "vitest";
import { ms } from "../internal";
import type { Duration } from "../types";

const testCases: { input: Duration; expected: number }[] = [
  { input: "1s", expected: 1000 },
  { input: "2m", expected: 120000 },
  { input: "1h", expected: 3600000 },
  { input: "24h", expected: 86400000 },
  { input: "1d", expected: 86400000 },
  { input: "2 hrs", expected: 7200000 },
  { input: "2 hours", expected: 7200000 },
  { input: "2hr", expected: 7200000 },
];

describe("parse duration", () => {
  testCases.forEach(({ input, expected }) => {
    it(`should convert ${input} to ${expected}ms`, () => {
      expect(ms(input)).toBe(expected);
    });
  });
});
