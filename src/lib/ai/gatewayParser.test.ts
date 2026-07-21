import { describe, it, expect, vi, beforeEach } from "vitest";

// gatewayParser imports "server-only" (line 1) — throws under the test runtime otherwise.
vi.mock("server-only", () => ({}));

// Mock only generateText; keep the real Output helper.
const { generateTextMock } = vi.hoisted(() => ({ generateTextMock: vi.fn() }));
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, generateText: generateTextMock };
});

import { GatewayTaskParser } from "./gatewayParser";

beforeEach(() => {
  generateTextMock.mockReset();
  generateTextMock.mockResolvedValue({ output: [] });
});

describe("GatewayTaskParser BYOK", () => {
  it("passes AI_API_KEY as gateway BYOK for anthropic when byokKey is set", async () => {
    await new GatewayTaskParser({ model: "anthropic/claude-haiku-4.5", byokKey: "sk-ant-test" }).parse("Gym");
    const args = generateTextMock.mock.calls[0][0];
    expect(args.providerOptions.gateway.byok.anthropic[0].apiKey).toBe("sk-ant-test");
  });

  it("sends no providerOptions when byokKey is absent", async () => {
    await new GatewayTaskParser({ model: "openai/gpt-4o-mini" }).parse("Gym");
    const args = generateTextMock.mock.calls[0][0];
    expect(args.providerOptions).toBeUndefined();
  });
});
