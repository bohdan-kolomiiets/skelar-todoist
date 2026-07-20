import type { Task, TimeOfDay } from "./types";
import { isOverdue } from "./routing";

const TOD_RANK: Record<TimeOfDay, number> = { morning: 0, afternoon: 1, evening: 2 };
const PRIORITY_RANK: Record<Task["priority"], number> = { high: 0, medium: 1, low: 2, none: 3 };

/** PRODUCT §7: exact time → timeOfDay bucket → priority → manual order. */
export function sortForToday(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.time && b.time) return a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
    if (a.time && !b.time) return -1;
    if (!a.time && b.time) return 1;
    const at = a.timeOfDay ? TOD_RANK[a.timeOfDay] : 3;
    const bt = b.timeOfDay ? TOD_RANK[b.timeOfDay] : 3;
    if (at !== bt) return at - bt;
    const ap = PRIORITY_RANK[a.priority];
    const bp = PRIORITY_RANK[b.priority];
    if (ap !== bp) return ap - bp;
    return a.order - b.order;
  });
}

function bucketOf(task: Task): "morning" | "afternoon" | "evening" | "anytime" {
  if (task.timeOfDay) return task.timeOfDay;
  if (task.time) {
    const hour = Number(task.time.slice(0, 2));
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    return "evening";
  }
  return "anytime";
}

export function groupToday(tasks: Task[], today: string) {
  const sorted = sortForToday(tasks);
  const out = { overdue: [] as Task[], morning: [] as Task[], afternoon: [] as Task[], evening: [] as Task[], anytime: [] as Task[] };
  for (const task of sorted) {
    if (isOverdue(task, today)) out.overdue.push(task);
    else out[bucketOf(task)].push(task);
  }
  return out;
}

export function groupInbox(tasks: Task[], today: string) {
  const scheduled = tasks
    .filter((t) => t.doDate !== null && t.doDate > today)
    .sort((a, b) => (a.doDate! < b.doDate! ? -1 : a.doDate! > b.doDate! ? 1 : a.order - b.order));
  const someday = tasks.filter((t) => t.doDate === null).sort((a, b) => a.order - b.order);
  return { scheduled, someday };
}
