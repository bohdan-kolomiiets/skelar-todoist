import assert from "node:assert/strict";
import type { ParsedTask } from "@/lib/task/types";

/**
 * Golden dataset: canonical inputs + invariants both the fake and real parsers
 * must satisfy. Invariants assert only shared truths (routing, priority, deadline
 * presence) — not exact strings, so the non-deterministic real model can pass too.
 * Anchored to today = 2026-07-20 (a Monday); pass { today: "2026-07-20" } to the parser.
 */
export const TODAY = "2026-07-20";

export const parseCases: { name: string; input: string; invariants(tasks: ParsedTask[]): void }[] = [
  {
    name: "explicit-today-with-deadline",
    input: "Finish the pitch deck today, due Friday",
    invariants(tasks) {
      assert.equal(tasks.length, 1);
      assert.equal(tasks[0].doDate, TODAY, "today → doDate is today");
      assert.ok(tasks[0].deadline, "'due Friday' → a deadline is set");
      assert.notEqual(tasks[0].deadline, tasks[0].doDate, "deadline is distinct from doDate");
    },
  },
  {
    name: "part-of-day-only",
    input: "Gym this evening",
    invariants(tasks) {
      assert.equal(tasks.length, 1);
      assert.equal(tasks[0].doDate, TODAY, "part-of-day only that falls today → today");
      assert.equal(tasks[0].timeOfDay, "evening");
    },
  },
  {
    name: "urgent-signal",
    input: "Reply to Anna — urgent",
    invariants(tasks) {
      assert.equal(tasks.length, 1);
      assert.equal(tasks[0].priority, "high", "'urgent' → high priority");
    },
  },
  {
    name: "someday-backlog",
    input: "Someday read that design book",
    invariants(tasks) {
      assert.equal(tasks.length, 1);
      assert.equal(tasks[0].doDate ?? null, null, "'someday' → undated (Inbox backlog)");
    },
  },
  {
    name: "canonical-multi-clause-dump",
    input: "Finish the pitch deck today, due Friday. Gym this evening. Reply to Anna — urgent. Someday read that design book.",
    invariants(tasks) {
      assert.equal(tasks.length, 4, "four clauses → four tasks");
      const someday = tasks.filter((t) => (t.doDate ?? null) === null);
      assert.equal(someday.length, 1, "exactly the design book is undated");
      assert.ok(tasks.some((t) => t.priority === "high"), "the urgent reply is high priority");
      assert.ok(tasks.some((t) => t.timeOfDay === "evening"), "the gym is an evening task");
      assert.ok(tasks.some((t) => t.deadline), "the deck has a deadline");
    },
  },
];
