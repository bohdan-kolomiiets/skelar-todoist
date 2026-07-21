import { describe, it, expect } from "vitest";
import { deadlineBadge, formatDoDate, formatFullDate } from "./format";

const TODAY = "2026-07-20"; // a Monday

describe("deadlineBadge", () => {
  it("shows 'due today' for today", () => {
    expect(deadlineBadge("2026-07-20", TODAY)).toEqual({ label: "due today", tone: "warning" });
  });
  it("shows 'due tomorrow' for the next day", () => {
    expect(deadlineBadge("2026-07-21", TODAY)).toEqual({ label: "due tomorrow", tone: "warning" });
  });
  it("shows 'due in 3 days' within a week", () => {
    expect(deadlineBadge("2026-07-23", TODAY)).toEqual({ label: "due in 3 days", tone: "warning" });
  });
  it("shows an absolute date beyond a week", () => {
    expect(deadlineBadge("2026-08-01", TODAY)).toEqual({ label: "due Aug 1", tone: "normal" });
  });
  it("shows overdue in danger tone", () => {
    expect(deadlineBadge("2026-07-18", TODAY)).toEqual({ label: "due 2 days ago", tone: "danger" });
  });
});

describe("formatDoDate", () => {
  it("labels tomorrow", () => {
    expect(formatDoDate("2026-07-21", TODAY)).toBe("tomorrow");
  });
  it("labels a nearby weekday by name", () => {
    expect(formatDoDate("2026-07-24", TODAY)).toBe("Fri");
  });
  it("labels a far date absolutely", () => {
    expect(formatDoDate("2026-08-15", TODAY)).toBe("Aug 15");
  });
});

describe("formatFullDate", () => {
  it("formats the date with full weekday name", () => {
    expect(formatFullDate("2026-07-20")).toBe("Monday, Jul 20");
  });
});
