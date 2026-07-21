import { describe, it, expect, vi } from "vitest";

// gatewayParser imports "server-only" transitively; it throws under jsdom otherwise.
vi.mock("server-only", () => ({}));

// Force deterministic mode; the FakeTaskParser (real, deterministic) does the work.
vi.mock("@/lib/ai/mode", () => ({ resolveAiMode: () => Promise.resolve("fake") }));

import { POST } from "./route";

function req(body: unknown) {
  return new Request("http://test/api/organize", { method: "POST", body: JSON.stringify(body) });
}

describe("POST /api/organize", () => {
  it("returns structured tasks for a dump (fake mode)", async () => {
    const res = await POST(req({ text: "Gym this evening" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.tasks[0].timeOfDay).toBe("evening");
  });

  it("400s on empty text", async () => {
    const res = await POST(req({ text: "   " }));
    expect(res.status).toBe(400);
  });

  it("400s when text is missing", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it("400s on an invalid JSON body", async () => {
    const res = await POST(new Request("http://test/api/organize", { method: "POST", body: "not json" }));
    expect(res.status).toBe(400);
  });
});
