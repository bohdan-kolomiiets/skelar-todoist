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
});
