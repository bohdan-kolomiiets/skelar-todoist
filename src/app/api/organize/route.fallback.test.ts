import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
// Real mode: exercise the live-parser path so the fallback can trigger.
vi.mock("@/lib/ai/mode", () => ({ resolveAiMode: () => Promise.resolve("real") }));
// The Gateway parser is unavailable (e.g. free-tier RestrictedModelsError, timeout).
vi.mock("@/lib/ai/gatewayParser", () => ({
  GatewayTaskParser: class {
    parse() {
      return Promise.reject(new Error("403 RestrictedModelsError SECRET"));
    }
  },
}));
// FakeTaskParser is intentionally NOT mocked — the real deterministic parser is the fallback.

import { POST } from "./route";

function req(body: unknown) {
  return new Request("http://test/api/organize", { method: "POST", body: JSON.stringify(body) });
}

describe("POST /api/organize — graceful degradation (real mode)", () => {
  it("falls back to the deterministic parser and flags the response as degraded", async () => {
    const res = await POST(req({ text: "Gym this evening" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.degraded).toBe(true);
    expect(Array.isArray(json.tasks)).toBe(true);
    expect(json.tasks.length).toBeGreaterThan(0);
    expect(json.tasks[0].timeOfDay).toBe("evening"); // came from the real fake parser
  });

  it("never leaks the internal gateway error to the client", async () => {
    const res = await POST(req({ text: "Gym this evening" }));
    const body = JSON.stringify(await res.json());
    expect(body).not.toContain("SECRET");
    expect(body).not.toContain("RestrictedModelsError");
  });
});
