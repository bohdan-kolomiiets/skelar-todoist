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

// Silence the route's aiMode log + internal error log so this error-path test stays clean.
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

import { POST } from "./route";

describe("POST /api/organize — parser failure", () => {
  it("returns 502 with an honest, non-blaming message and no internal error detail", async () => {
    const res = await POST(
      new Request("http://test/api/organize", { method: "POST", body: JSON.stringify({ text: "Gym" }) }),
    );
    expect(res.status).toBe(502);
    const json = await res.json();
    // Genuine internal failure — must not blame the user's phrasing ("Try rephrasing").
    expect(json.error).toBe("Something went wrong organizing that. Please try again.");
    expect(json.error).not.toMatch(/rephras/i);
    const body = JSON.stringify(json);
    expect(body).not.toContain("boom");
    expect(body).not.toContain("INTERNAL");
  });
});
