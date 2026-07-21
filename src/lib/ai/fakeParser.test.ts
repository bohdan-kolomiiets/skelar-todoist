import { describe, it, expect } from "vitest";
import { FakeTaskParser } from "./fakeParser";
import { parseCases, TODAY } from "./fixtures/parseCases";

describe("FakeTaskParser (golden dataset)", () => {
  const parser = new FakeTaskParser({ today: TODAY });

  for (const c of parseCases) {
    it(`satisfies invariants: ${c.name}`, async () => {
      const tasks = await parser.parse(c.input);
      expect(() => c.invariants(tasks)).not.toThrow();
    });
  }

  it("is deterministic + regression-locked (snapshot)", async () => {
    const tasks = await parser.parse(parseCases[4].input); // canonical dump
    expect(tasks).toMatchSnapshot();
  });

  it("returns [] for an empty dump", async () => {
    expect(await parser.parse("   ")).toEqual([]);
  });

  it("does not treat 'overdue' as a deadline cue or corrupt the title", async () => {
    const [task] = await parser.parse("Pay the overdue invoice tomorrow");
    expect(task.title.toLowerCase()).toContain("overdue invoice");
    expect(task.deadline ?? null).toBeNull();
    expect(task.doDate).toBe("2026-07-21"); // tomorrow
  });

  it("routes by the do-date weekday, not the deadline weekday, when both appear", async () => {
    const [task] = await parser.parse("Submit the form due Tuesday, present it Thursday");
    expect(task.doDate).toBe("2026-07-23"); // Thursday — the do-date weekday
    expect(task.deadline).toBe("2026-07-21"); // due Tuesday — the deadline
  });
});
