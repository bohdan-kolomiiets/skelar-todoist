import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@vercel/edge-config", () => ({ get: vi.fn(async () => undefined) }));

import { resolveFreeDailyInputs, FREE_DAILY_INPUTS_FALLBACK } from "./limits";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("resolveFreeDailyInputs", () => {
  it("falls back to 3 when Edge Config and env are unset", async () => {
    expect(FREE_DAILY_INPUTS_FALLBACK).toBe(3);
    expect(await resolveFreeDailyInputs()).toBe(3);
  });

  it("reads a positive integer from env FREE_DAILY_INPUTS when Edge Config is unset", async () => {
    vi.stubEnv("FREE_DAILY_INPUTS", "5");
    expect(await resolveFreeDailyInputs()).toBe(5);
  });

  it("ignores a non-numeric / non-positive env value and falls back", async () => {
    vi.stubEnv("FREE_DAILY_INPUTS", "abc");
    expect(await resolveFreeDailyInputs()).toBe(3);
    vi.stubEnv("FREE_DAILY_INPUTS", "0");
    expect(await resolveFreeDailyInputs()).toBe(3);
  });
});
