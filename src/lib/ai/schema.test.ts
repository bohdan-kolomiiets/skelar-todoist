import { describe, it, expect } from "vitest";
import { parsedTaskSchema, parsedTasksSchema } from "./schema";
import { buildSystemPrompt } from "./prompt";

describe("parsedTaskSchema", () => {
  it("accepts a minimal task (title only)", () => {
    expect(parsedTaskSchema.parse({ title: "Book dentist" }).title).toBe("Book dentist");
  });

  it("accepts the full contract shape", () => {
    const full = {
      title: "Finish deck",
      notes: null,
      doDate: "2026-07-20",
      time: null,
      timeOfDay: "evening",
      deadline: "2026-07-24",
      priority: "high",
      tags: ["work"],
    };
    expect(parsedTasksSchema.parse([full])).toHaveLength(1);
  });

  it("rejects an unknown priority", () => {
    expect(() => parsedTaskSchema.parse({ title: "x", priority: "critical" })).toThrow();
  });
});

describe("buildSystemPrompt", () => {
  it("embeds today's date and the routing/priority rules", () => {
    const p = buildSystemPrompt({ today: "2026-07-20", knownTags: ["work"] });
    expect(p).toContain("2026-07-20");
    expect(p).toMatch(/priority/i);
    expect(p).toContain("work");
  });
});
