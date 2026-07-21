import { describe, it, expect, vi, afterEach } from "vitest";
import { organize } from "./organizeClient";

afterEach(() => vi.restoreAllMocks());

describe("organize", () => {
  it("returns tasks on success", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ tasks: [{ title: "Gym", timeOfDay: "evening" }] }), { status: 200 }),
    );
    const tasks = await organize("Gym this evening");
    expect(tasks).toEqual([{ title: "Gym", timeOfDay: "evening" }]);
  });

  it("throws the server error message on failure", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Please enter something to plan." }), { status: 400 }),
    );
    await expect(organize("  ")).rejects.toThrow(/enter something/i);
  });
});
