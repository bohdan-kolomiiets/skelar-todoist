import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");

describe("accent palette (Dayspark Phase 1)", () => {
  it("uses the functional deep-coral accent, not the old blue", () => {
    expect(css).toContain("--color-fill-accent: #c2410c");
    expect(css).toContain("--color-text-accent: #c2410c");
    expect(css).toContain("--color-bg-accent: #fbe9e1");
    expect(css).not.toContain("#1f6fd0");
    expect(css).not.toContain("#185fa5");
    expect(css).not.toContain("#e6f1fb");
  });

  it("keeps the decorative bright brand coral available", () => {
    expect(css).toContain("--color-brand-coral: #ff6a3d");
  });
});
