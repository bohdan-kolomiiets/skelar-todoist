import type { ParsedTask, TimeOfDay } from "@/lib/task/types";
import { todayISO } from "@/lib/date/clock";
import type { TaskParser } from "./parser";

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** Next date (today or later) whose weekday matches `name`. */
function nextWeekday(name: string, today: string): string | null {
  const target = WEEKDAYS.indexOf(name);
  if (target < 0) return null;
  const [y, m, d] = today.split("-").map(Number);
  const todayDow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const delta = (target - todayDow + 7) % 7;
  return addDays(today, delta === 0 ? 7 : delta); // "Friday" said means the upcoming Friday
}

/** Resolve a date expression after "due"/"on" to YYYY-MM-DD, else null. */
function resolveDate(expr: string, today: string): string | null {
  const e = expr.trim().toLowerCase();
  if (e.startsWith("today")) return today;
  if (e.startsWith("tomorrow")) return addDays(today, 1);
  const wd = WEEKDAYS.find((w) => e.startsWith(w) || e.startsWith(w.slice(0, 3)));
  if (wd) return nextWeekday(wd, today);
  return null;
}

/**
 * Deterministic rule-based parser. Purpose: cost-free local dev, a demo-credible
 * grading fallback, and the oracle for golden tests. Rules follow the plan's
 * documented routing interpretation.
 */
export class FakeTaskParser implements TaskParser {
  private today: string;
  constructor(deps: { today?: string } = {}) {
    this.today = deps.today ?? todayISO();
  }

  async parse(text: string): Promise<ParsedTask[]> {
    return text
      .split(/[.\n;]+/)
      .map((c) => c.trim())
      .filter(Boolean)
      .map((clause) => this.parseClause(clause));
  }

  private parseClause(clause: string): ParsedTask {
    const lower = clause.toLowerCase();
    const task: ParsedTask = { title: clause, priority: "none", tags: [] };

    // priority
    if (/(\burgent\b|\basap\b|\bimportant\b|\bmust\b|!!)/.test(lower)) task.priority = "high";

    // deadline: "due <expr>"
    const due = lower.match(/\bdue\s+([a-z]+)/);
    if (due) task.deadline = resolveDate(due[1], this.today);

    // part of day
    const tod = lower.match(/\b(morning|afternoon|evening)\b/);
    if (tod) task.timeOfDay = tod[1] as TimeOfDay;

    // exact time: "3pm", "15:00", "at 9"
    const t12 = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
    const t24 = lower.match(/\b(\d{1,2}):(\d{2})\b/);
    if (t12) {
      let h = Number(t12[1]) % 12;
      if (t12[3] === "pm") h += 12;
      task.time = `${String(h).padStart(2, "0")}:${t12[2] ?? "00"}`;
    } else if (t24) {
      task.time = `${t24[1].padStart(2, "0")}:${t24[2]}`;
    }

    // relative offsets: "in N days", "in N weeks", "next week" / "in a week"
    const inDays = lower.match(/\bin\s+(\d+)\s+days?\b/);
    const inWeeks = lower.match(/\bin\s+(\d+)\s+weeks?\b/);
    const nextWeek = /\bnext week\b|\bin a week\b/.test(lower);

    // routing: someday → null; explicit other/future date → that date; else today
    if (/\bsomeday\b|\bone day\b/.test(lower)) {
      task.doDate = null;
    } else if (/\btomorrow\b/.test(lower)) {
      task.doDate = addDays(this.today, 1);
    } else if (inDays) {
      task.doDate = addDays(this.today, Number(inDays[1]));
    } else if (inWeeks) {
      task.doDate = addDays(this.today, 7 * Number(inWeeks[1]));
    } else if (nextWeek) {
      task.doDate = addDays(this.today, 7);
    } else {
      // Route by a bare weekday, but skip the weekday already consumed by "due X"
      // (deadline is not the do-date).
      const wd = WEEKDAYS.find(
        (w) => new RegExp(`\\b${w}\\b`).test(lower) && !(due && due[1].startsWith(w.slice(0, 3))),
      );
      if (wd) task.doDate = nextWeekday(wd, this.today);
      else task.doDate = this.today;
    }

    task.title = this.cleanTitle(clause);
    return task;
  }

  private cleanTitle(clause: string): string {
    const t = clause
      .replace(/,?\s*\bdue\s+[a-z]+/gi, "")
      .replace(/\b(today|tomorrow|this)\b/gi, "")
      .replace(/\bin\s+\d+\s+(days?|weeks?)\b/gi, "")
      .replace(/\b(next week|in a week)\b/gi, "")
      .replace(/\b(morning|afternoon|evening)\b/gi, "")
      .replace(/\b(someday|one day)\b/gi, "")
      .replace(/\b(urgent|asap|important|must)\b/gi, "")
      .replace(/\b\d{1,2}(?::\d{2})?\s*(am|pm)\b/gi, "")
      .replace(/[—–-]\s*$/g, "")
      .replace(/\s{2,}/g, " ")
      .replace(/[\s,]+$/g, "")
      .trim();
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
}
