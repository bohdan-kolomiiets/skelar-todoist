import { describe, it, expect, vi, afterEach } from "vitest";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));
vi.mock("@vercel/edge-config", () => ({ get: getMock }));

import { resolveAiMode, resolveAiModel, DEFAULT_AI_MODEL } from "./mode";

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

describe("resolveAiModel", () => {
  const orig = process.env.AI_MODEL;
  afterEach(() => {
    if (orig === undefined) delete process.env.AI_MODEL;
    else process.env.AI_MODEL = orig;
    getMock.mockReset();
  });

  it("uses a valid Edge Config slug", async () => {
    getMock.mockResolvedValue("anthropic/claude-haiku-4.5");
    expect(await resolveAiModel()).toBe("anthropic/claude-haiku-4.5");
  });
  it("falls back to env AI_MODEL when Edge Config throws", async () => {
    getMock.mockRejectedValue(new Error("unavailable"));
    process.env.AI_MODEL = "anthropic/claude-haiku-4.5";
    expect(await resolveAiModel()).toBe("anthropic/claude-haiku-4.5");
  });
  it("defaults to gpt-4o-mini when nothing is set", async () => {
    getMock.mockRejectedValue(new Error("unavailable"));
    delete process.env.AI_MODEL;
    expect(await resolveAiModel()).toBe(DEFAULT_AI_MODEL);
    expect(DEFAULT_AI_MODEL).toBe("openai/gpt-4o-mini");
  });
  it("ignores a non-slug Edge Config value (no '/')", async () => {
    getMock.mockResolvedValue("gpt-4o-mini"); // missing provider prefix
    delete process.env.AI_MODEL;
    expect(await resolveAiModel()).toBe(DEFAULT_AI_MODEL);
  });
});
