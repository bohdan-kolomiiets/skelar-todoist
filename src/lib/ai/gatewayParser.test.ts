import { describe, it, expect, vi, beforeEach } from "vitest";

// gatewayParser imports "server-only" (line 1) — throws under the test runtime otherwise.
vi.mock("server-only", () => ({}));

// Mock generateText (keep the real Output helper); mock the direct Anthropic provider.
const { generateTextMock, createAnthropicMock, anthropicProviderMock } = vi.hoisted(() => {
  const anthropicProviderMock = vi.fn((id: string) => ({ __anthropicModelId: id }));
  return {
    generateTextMock: vi.fn(),
    anthropicProviderMock,
    createAnthropicMock: vi.fn(() => anthropicProviderMock),
  };
});
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, generateText: generateTextMock };
});
vi.mock("@ai-sdk/anthropic", () => ({ createAnthropic: createAnthropicMock }));

import { GatewayTaskParser } from "./gatewayParser";

beforeEach(() => {
  generateTextMock.mockReset().mockResolvedValue({ output: [] });
  createAnthropicMock.mockClear();
  anthropicProviderMock.mockClear();
});

describe("GatewayTaskParser provider routing", () => {
  it("routes anthropic/* to the direct Anthropic SDK on the user's key (bypassing the gateway)", async () => {
    await new GatewayTaskParser({ model: "anthropic/claude-haiku-4.5", apiKey: "sk-ant-test" }).parse("Gym");
    expect(createAnthropicMock).toHaveBeenCalledWith({ apiKey: "sk-ant-test" });
    // gateway slug → direct model id: strip "anthropic/", version dot → hyphen
    expect(anthropicProviderMock).toHaveBeenCalledWith("claude-haiku-4-5");
    expect(generateTextMock.mock.calls[0][0].model).toEqual({ __anthropicModelId: "claude-haiku-4-5" });
  });

  it("routes non-anthropic models through the gateway as a plain model string", async () => {
    await new GatewayTaskParser({ model: "openai/gpt-4o-mini", apiKey: "sk-ant-test" }).parse("Gym");
    expect(createAnthropicMock).not.toHaveBeenCalled();
    expect(generateTextMock.mock.calls[0][0].model).toBe("openai/gpt-4o-mini");
  });

  it("falls back to the gateway string for anthropic when no key is available (route then degrades)", async () => {
    await new GatewayTaskParser({ model: "anthropic/claude-haiku-4.5" }).parse("Gym");
    expect(createAnthropicMock).not.toHaveBeenCalled();
    expect(generateTextMock.mock.calls[0][0].model).toBe("anthropic/claude-haiku-4.5");
  });
});
