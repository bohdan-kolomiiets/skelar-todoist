import { describe, it, expect } from "vitest";
import { daysparkMetadata as metadata, daysparkViewport as viewport } from "./metadata";

describe("root metadata", () => {
  it("carries the Dayspark title, description, and metadataBase", () => {
    expect(metadata.title).toBe("Dayspark — AI day planner");
    expect(String(metadata.description)).toMatch(/chaos into a clear plan/i);
    expect(String(metadata.metadataBase)).toContain("skelar-todoist.vercel.app");
  });

  it("declares Open Graph and a summary_large_image Twitter card", () => {
    expect(metadata.openGraph?.title).toMatch(/dayspark/i);
    expect((metadata.twitter as { card?: string })?.card).toBe("summary_large_image");
  });

  it("sets the brand theme color", () => {
    expect(JSON.stringify(viewport.themeColor)).toContain("#FF6A3D".toLowerCase());
  });
});
