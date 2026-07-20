import type { Task } from "./types";

export function isToday(task: Task, today: string): boolean {
  return task.doDate === today;
}

/** Active task whose do-date is before today (PRODUCT §7 Overdue). */
export function isOverdue(task: Task, today: string): boolean {
  return task.status === "active" && task.doDate !== null && task.doDate < today;
}

/**
 * Which screen a task belongs to (PRODUCT §2, §4).
 * Today = do-date is today OR overdue-active (surfaces in Today's Overdue section).
 * Everything else (null backlog, future date) = Inbox.
 */
export function viewOf(task: Task, today: string): "today" | "inbox" {
  if (task.doDate === null) return "inbox";
  if (task.doDate === today) return "today";
  if (isOverdue(task, today)) return "today";
  return "inbox";
}
