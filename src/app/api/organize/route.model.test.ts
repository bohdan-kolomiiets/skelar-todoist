import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
import { todayISO } from "@/lib/date/clock";

const origKey = process.env.AI_API_KEY;
beforeEach(() => {
  ctorArgs.value = null;
  process.env.AI_API_KEY = "sk-ant-test";
});
afterEach(() => {
  if (origKey === undefined) delete process.env.AI_API_KEY;
  else process.env.AI_API_KEY = origKey;
});

describe("POST /api/organize — real-mode model + key wiring", () => {
  it("constructs the real parser with the resolved model and AI_API_KEY as apiKey", async () => {
    const res = await POST(
      new Request("http://test/api/organize", { method: "POST", body: JSON.stringify({ text: "Gym" }) }),
    );
    expect(res.status).toBe(200);
    expect(ctorArgs.value).toEqual({
      model: "anthropic/claude-haiku-4.5",
      apiKey: "sk-ant-test",
      today: todayISO(),
    });
    const json = await res.json();
    expect(json.degraded).toBe(false);
  });
});
