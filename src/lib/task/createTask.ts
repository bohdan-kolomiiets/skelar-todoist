import type { ParsedTask, Task, TaskDraft } from "./types";

interface HydrateDeps {
  id?: string;
  now?: string;
  order?: number;
}

/**
 * Hydrate a ParsedTask/TaskDraft (parseable fields only) into a full Task.
 * The app — never the AI — owns id, status, timestamps, and order.
 */
export function createTask(input: ParsedTask | TaskDraft, deps: HydrateDeps = {}): Task {
  const now = deps.now ?? new Date().toISOString();
  const task: Task = {
    id: deps.id ?? crypto.randomUUID(),
    title: input.title,
    notes: input.notes ?? null,
    doDate: input.doDate ?? null,
    time: input.time ?? null,
    timeOfDay: input.timeOfDay ?? null,
    deadline: input.deadline ?? null,
    priority: input.priority ?? "none",
    tags: input.tags ?? [],
    status: "active",
    createdAt: now,
    completedAt: null,
    order: deps.order ?? Date.now(),
  };
  if (input.needsDate) task.needsDate = true;
  return task;
}
