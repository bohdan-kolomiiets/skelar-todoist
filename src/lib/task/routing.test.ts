import { describe, it, expect } from "vitest";
import { viewOf, isToday, isOverdue } from "./routing";
import { createTask } from "./createTask";

const TODAY = "2026-07-20";
const make = (doDate: string | null, status: "active" | "done" = "active") => {
  const t = createTask({ title: "t", doDate }, { id: "id", now: "2026-07-20T00:00:00Z", order: 0 });
  return { ...t, status };
};

describe("viewOf", () => {
  it("routes today's do-date to Today", () => {
    expect(viewOf(make(TODAY), TODAY)).toBe("today");
  });
  it("routes null (backlog) to Inbox", () => {
    expect(viewOf(make(null), TODAY)).toBe("inbox");
  });
  it("routes a future do-date to Inbox", () => {
    expect(viewOf(make("2026-07-25"), TODAY)).toBe("inbox");
  });
  it("routes an overdue active do-date to Today (overdue section)", () => {
    expect(viewOf(make("2026-07-18"), TODAY)).toBe("today");
  });
});

describe("isOverdue", () => {
  it("is true for a past active do-date", () => {
    expect(isOverdue(make("2026-07-18"), TODAY)).toBe(true);
  });
  it("is false when done", () => {
    expect(isOverdue(make("2026-07-18", "done"), TODAY)).toBe(false);
  });
  it("is false for today", () => {
    expect(isOverdue(make(TODAY), TODAY)).toBe(false);
  });
});
