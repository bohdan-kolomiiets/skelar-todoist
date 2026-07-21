import { describe, it, expect, vi, afterEach } from "vitest";
import { organize } from "./organizeClient";

afterEach(() => vi.restoreAllMocks());

describe("organize", () => {
  it("returns tasks (not degraded) on success", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ tasks: [{ title: "Gym", timeOfDay: "evening" }], degraded: false }), {
        status: 200,
      }),
    );
    const result = await organize("Gym this evening");
    expect(result.tasks).toEqual([{ title: "Gym", timeOfDay: "evening" }]);
    expect(result.degraded).toBe(false);
  });

  it("surfaces the degraded flag when the server fell back to the fake parser", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ tasks: [{ title: "Gym" }], degraded: true }), { status: 200 }),
    );
    const result = await organize("Gym this evening");
    expect(result.degraded).toBe(true);
    expect(result.tasks).toHaveLength(1);
  });

  it("throws the server error message on failure", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Please enter something to plan." }), { status: 400 }),
    );
    await expect(organize("  ")).rejects.toThrow(/enter something/i);
  });

  it("returns freeDailyInputs from the response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ tasks: [], degraded: false, freeDailyInputs: 5 }), { status: 200 }),
    );
    const result = await organize("hi");
    expect(result.freeDailyInputs).toBe(5);
  });

  it("defaults freeDailyInputs to 3 when the field is absent", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ tasks: [], degraded: false }), { status: 200 }),
    );
    const result = await organize("hi");
    expect(result.freeDailyInputs).toBe(3);
  });
});
