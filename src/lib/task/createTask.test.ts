import { describe, it, expect } from "vitest";
import { createTask } from "./createTask";
import type { ParsedTask } from "./types";

const parsed: ParsedTask = {
  title: "Book dentist",
  notes: null,
  doDate: "2026-07-20",
  time: null,
  timeOfDay: null,
  deadline: null,
  priority: "none",
  tags: [],
};

describe("createTask", () => {
  it("hydrates a ParsedTask into a full active Task", () => {
    const task = createTask(parsed, {
      id: "fixed-id",
      now: "2026-07-20T09:00:00.000Z",
      order: 1,
    });
    expect(task).toEqual({
      id: "fixed-id",
      title: "Book dentist",
      notes: null,
      doDate: "2026-07-20",
      time: null,
      timeOfDay: null,
      deadline: null,
      priority: "none",
      tags: [],
      status: "active",
      createdAt: "2026-07-20T09:00:00.000Z",
      completedAt: null,
      order: 1,
    });
  });

  it("defaults priority to 'none', tags to [], and doDate to null when omitted", () => {
    const task = createTask({ title: "Loose thought" }, { id: "x", now: "2026-07-20T09:00:00.000Z", order: 0 });
    expect(task.priority).toBe("none");
    expect(task.tags).toEqual([]);
    expect(task.doDate).toBeNull();
    expect(task.status).toBe("active");
  });

  it("generates an id and timestamps when deps are not provided", () => {
    const task = createTask({ title: "Auto" });
    expect(task.id).toMatch(/[0-9a-f-]{36}/);
    expect(task.createdAt).not.toBe("");
    expect(typeof task.order).toBe("number");
  });
});
