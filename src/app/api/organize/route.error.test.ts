import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/mode", () => ({ resolveAiMode: () => Promise.resolve("fake") }));
vi.mock("@/lib/ai/fakeParser", () => ({
  FakeTaskParser: class {
    parse() {
      return Promise.reject(new Error("INTERNAL boom secret"));
    }
  },
}));

import { POST } from "./route";

describe("POST /api/organize — parser failure", () => {
  it("returns 502 with a generic message and no internal error detail", async () => {
    const res = await POST(
      new Request("http://test/api/organize", { method: "POST", body: JSON.stringify({ text: "Gym" }) }),
    );
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toBe("Could not structure that. Try rephrasing.");
    const body = JSON.stringify(json);
    expect(body).not.toContain("boom");
    expect(body).not.toContain("INTERNAL");
  });
});
