import { describe, it, expect, vi, afterEach } from "vitest";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));
vi.mock("@vercel/edge-config", () => ({ get: getMock }));

import { resolveAiMode } from "./mode";

describe("resolveAiMode", () => {
  const orig = process.env.AI_MODE;
  afterEach(() => {
    if (orig === undefined) delete process.env.AI_MODE;
    else process.env.AI_MODE = orig;
    getMock.mockReset();
  });

  it("uses a valid Edge Config value", async () => {
    getMock.mockResolvedValue("real");
    expect(await resolveAiMode()).toBe("real");
  });
  it("falls back to env AI_MODE when Edge Config throws", async () => {
    getMock.mockRejectedValue(new Error("unavailable"));
    process.env.AI_MODE = "real";
    expect(await resolveAiMode()).toBe("real");
  });
  it("defaults to fake when Edge Config throws and no env is set", async () => {
    getMock.mockRejectedValue(new Error("unavailable"));
    delete process.env.AI_MODE;
    expect(await resolveAiMode()).toBe("fake");
  });
  it("ignores an invalid Edge Config value", async () => {
    getMock.mockResolvedValue("bogus");
    delete process.env.AI_MODE;
    expect(await resolveAiMode()).toBe("fake");
  });
});
