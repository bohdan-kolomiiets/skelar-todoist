import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/mode", () => ({
  resolveAiMode: () => Promise.resolve("real"),
  resolveAiModel: () => Promise.resolve("anthropic/claude-haiku-4.5"),
}));

// Capture how the route constructs the gateway parser; return a successful parse.
const { ctorArgs } = vi.hoisted(() => ({ ctorArgs: { value: null as unknown } }));
vi.mock("@/lib/ai/gatewayParser", () => ({
  GatewayTaskParser: class {
    constructor(deps: unknown) {
      ctorArgs.value = deps;
    }
    parse() {
      return Promise.resolve([{ title: "Gym" }]);
    }
  },
}));

vi.spyOn(console, "log").mockImplementation(() => {});

import { POST } from "./route";

beforeEach(() => {
  ctorArgs.value = null;
  process.env.AI_API_KEY = "sk-ant-test";
});

describe("POST /api/organize — real-mode model + BYOK wiring", () => {
  it("constructs the gateway parser with the resolved model and AI_API_KEY as byokKey", async () => {
    const res = await POST(
      new Request("http://test/api/organize", { method: "POST", body: JSON.stringify({ text: "Gym" }) }),
    );
    expect(res.status).toBe(200);
    expect(ctorArgs.value).toEqual({ model: "anthropic/claude-haiku-4.5", byokKey: "sk-ant-test" });
    const json = await res.json();
    expect(json.degraded).toBe(false);
  });
});
