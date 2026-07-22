import { describe, it, expect } from "vitest";
import { parsedTaskSchema, parsedTasksSchema, modelTaskSchema } from "./schema";
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

  it("accepts null priority/tags (real strict-mode models emit null, not omission)", () => {
    const parsed = parsedTaskSchema.parse({ title: "x", priority: null, tags: null });
    expect(parsed.title).toBe("x");
  });
});

describe("modelTaskSchema (OpenAI strict-mode output contract)", () => {
  it("requires every key present — strict mode can't omit keys, only null them", () => {
    // The lenient contract accepts a title-only task…
    expect(() => parsedTaskSchema.parse({ title: "x" })).not.toThrow();
    // …but the model schema must list every field so OpenAI puts them all in `required`.
    expect(() => modelTaskSchema.parse({ title: "x" })).toThrow();
  });

  it("accepts every optional field as null", () => {
    const parsed = modelTaskSchema.parse({
      title: "Finish deck",
      notes: null,
      doDate: null,
      time: null,
      timeOfDay: null,
      deadline: null,
      priority: null,
      tags: null,
      needsDate: null,
    });
    expect(parsed.title).toBe("Finish deck");
  });

  it("stays contract-compatible: strict model output validates against the lenient schema", () => {
    const modelOut = modelTaskSchema.parse({
      title: "Gym",
      notes: null,
      doDate: null,
      time: null,
      timeOfDay: "evening",
      deadline: null,
      priority: null,
      tags: null,
      needsDate: null,
    });
    expect(() => parsedTaskSchema.parse(modelOut)).not.toThrow();
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
