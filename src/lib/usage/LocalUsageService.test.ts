import { describe, it, expect, beforeEach } from "vitest";
import { LocalUsageService, USAGE_KEY } from "./LocalUsageService";

const KEY = `${USAGE_KEY}:guest`;
const TODAY = "2026-07-22";
const TOMORROW = "2026-07-23";

describe("LocalUsageService", () => {
  beforeEach(() => localStorage.clear());

  it("counts 0 and full remaining before any use", () => {
    const u = new LocalUsageService(KEY);
    expect(u.count(TODAY)).toBe(0);
    expect(u.remaining(TODAY, 3)).toBe(3);
  });

  it("increments the count for today and reduces remaining", () => {
    const u = new LocalUsageService(KEY);
    u.increment(TODAY);
    u.increment(TODAY);
    expect(u.count(TODAY)).toBe(2);
    expect(u.remaining(TODAY, 3)).toBe(1);
  });

  it("clamps remaining at 0 (never negative)", () => {
    const u = new LocalUsageService(KEY);
    u.increment(TODAY);
    u.increment(TODAY);
    u.increment(TODAY);
    u.increment(TODAY);
    expect(u.remaining(TODAY, 3)).toBe(0);
  });

  it("resets automatically on a new local date (midnight reset)", () => {
    const u = new LocalUsageService(KEY);
    u.increment(TODAY);
    u.increment(TODAY);
    expect(u.count(TODAY)).toBe(2);
    // A new day: count is 0 again, and the first increment starts the new day at 1.
    expect(u.count(TOMORROW)).toBe(0);
    u.increment(TOMORROW);
    expect(u.count(TOMORROW)).toBe(1);
    expect(u.count(TODAY)).toBe(0); // stored date is now TOMORROW
  });

  it("persists across instances on the same key and isolates by key", () => {
    new LocalUsageService(KEY).increment(TODAY);
    expect(new LocalUsageService(KEY).count(TODAY)).toBe(1);
    expect(new LocalUsageService(`${USAGE_KEY}:other`).count(TODAY)).toBe(0);
  });

  it("tolerates corrupt JSON by reading as 0", () => {
    localStorage.setItem(KEY, "{not json");
    expect(new LocalUsageService(KEY).count(TODAY)).toBe(0);
  });
});
