import { describe, it, expect } from "vitest";
import { sortForToday, groupToday, groupInbox } from "./ordering";
import { createTask } from "./createTask";
import type { Task } from "./types";

const TODAY = "2026-07-20";
let seq = 0;
const t = (over: Partial<Task>): Task => ({
  ...createTask({ title: "t", doDate: TODAY }, { id: `id${seq}`, now: "2026-07-20T00:00:00Z", order: seq++ }),
  ...over,
});

describe("sortForToday", () => {
  it("orders exact time before timeOfDay before priority before manual order", () => {
    const timed = t({ time: "09:00" });
    const evening = t({ timeOfDay: "evening" });
    const morning = t({ timeOfDay: "morning" });
    const highNoTime = t({ priority: "high" });
    const plain = t({ order: 999 });
    const sorted = sortForToday([plain, highNoTime, evening, morning, timed]);
    expect(sorted.map((x) => x.id)).toEqual([timed.id, morning.id, evening.id, highNoTime.id, plain.id]);
  });

  it("falls through to priority when exact times are equal", () => {
    const lowPriorityAtNine = t({ time: "09:00", priority: "none", order: 0 });
    const highPriorityAtNine = t({ time: "09:00", priority: "high", order: 1 });
    const sorted = sortForToday([lowPriorityAtNine, highPriorityAtNine]);
    expect(sorted.map((x) => x.id)).toEqual([highPriorityAtNine.id, lowPriorityAtNine.id]);
  });
});

describe("groupToday", () => {
  it("splits overdue and buckets timed/timeOfDay tasks, rest to anytime", () => {
    const overdue = t({ doDate: "2026-07-18" });
    const morningTimed = t({ time: "08:00" });
    const evening = t({ timeOfDay: "evening" });
    const anytime = t({});
    const g = groupToday([anytime, evening, morningTimed, overdue], TODAY);
    expect(g.overdue.map((x) => x.id)).toEqual([overdue.id]);
    expect(g.morning.map((x) => x.id)).toEqual([morningTimed.id]);
    expect(g.evening.map((x) => x.id)).toEqual([evening.id]);
    expect(g.anytime.map((x) => x.id)).toEqual([anytime.id]);
  });

  it("buckets afternoon tasks correctly by timeOfDay or exact time", () => {
    const afternoonByTimeOfDay = t({ timeOfDay: "afternoon" });
    const afternoonByTime = t({ time: "13:00" });
    const g = groupToday([afternoonByTimeOfDay, afternoonByTime], TODAY);
    expect(g.afternoon.map((x) => x.id)).toEqual([afternoonByTime.id, afternoonByTimeOfDay.id]);
  });
});

describe("groupInbox", () => {
  it("splits future-dated (scheduled) from undated (someday)", () => {
    const scheduled = t({ doDate: "2026-07-25" });
    const someday = t({ doDate: null });
    const g = groupInbox([someday, scheduled], TODAY);
    expect(g.scheduled.map((x) => x.id)).toEqual([scheduled.id]);
    expect(g.someday.map((x) => x.id)).toEqual([someday.id]);
  });

  it("orders scheduled soonest-first", () => {
    const later = t({ doDate: "2026-07-30" });
    const sooner = t({ doDate: "2026-07-22" });
    const g = groupInbox([later, sooner], TODAY);
    expect(g.scheduled.map((x) => x.id)).toEqual([sooner.id, later.id]);
  });
});
