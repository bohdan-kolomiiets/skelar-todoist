import { describe, it, expect, vi, afterEach } from "vitest";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));
vi.mock("@vercel/edge-config", () => ({ get: getMock }));

import { resolveFreeDailyInputs, FREE_DAILY_INPUTS_FALLBACK } from "./limits";

afterEach(() => {
  vi.unstubAllEnvs();
  getMock.mockReset();
});

describe("resolveFreeDailyInputs", () => {
  // Edge Config unavailable / unset: fallback to env then hardcoded
  it("falls back to 3 when Edge Config and env are unset", async () => {
    getMock.mockResolvedValue(undefined);
    expect(FREE_DAILY_INPUTS_FALLBACK).toBe(3);
    expect(await resolveFreeDailyInputs()).toBe(3);
  });

  it("reads a positive integer from env FREE_DAILY_INPUTS when Edge Config is unset", async () => {
    getMock.mockResolvedValue(undefined);
    vi.stubEnv("FREE_DAILY_INPUTS", "5");
    expect(await resolveFreeDailyInputs()).toBe(5);
  });

  it("ignores a non-numeric / non-positive env value and falls back", async () => {
    getMock.mockResolvedValue(undefined);
    vi.stubEnv("FREE_DAILY_INPUTS", "abc");
    expect(await resolveFreeDailyInputs()).toBe(3);
    vi.stubEnv("FREE_DAILY_INPUTS", "0");
    expect(await resolveFreeDailyInputs()).toBe(3);
  });

  // Edge Config available: should take priority
  it("uses a valid Edge Config number value and wins over env", async () => {
    getMock.mockResolvedValue(5);
    vi.stubEnv("FREE_DAILY_INPUTS", "9");
    expect(await resolveFreeDailyInputs()).toBe(5);
  });

  it("accepts Edge Config numeric string value", async () => {
    getMock.mockResolvedValue("5");
    expect(await resolveFreeDailyInputs()).toBe(5);
  });

  it("ignores invalid Edge Config value (0 / negative / non-numeric) and falls through", async () => {
    getMock.mockResolvedValue(0);
    expect(await resolveFreeDailyInputs()).toBe(3);
    getMock.mockResolvedValue(-1);
    expect(await resolveFreeDailyInputs()).toBe(3);
    getMock.mockResolvedValue("abc");
    expect(await resolveFreeDailyInputs()).toBe(3);
    getMock.mockResolvedValue("abc");
    vi.stubEnv("FREE_DAILY_INPUTS", "7");
    expect(await resolveFreeDailyInputs()).toBe(7);
  });

  it("catches Edge Config error and falls through to env then fallback", async () => {
    getMock.mockRejectedValue(new Error("edge config unavailable"));
    expect(await resolveFreeDailyInputs()).toBe(3);
    vi.stubEnv("FREE_DAILY_INPUTS", "4");
    expect(await resolveFreeDailyInputs()).toBe(4);
  });
});
