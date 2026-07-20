"use client";

import { createContext, useCallback, useMemo, useState } from "react";
import type { Task, ParsedTask, TaskDraft } from "../task/types";
import { createTask } from "../task/createTask";
import { todayISO, nowISO } from "../date/clock";
import type { TaskStore } from "../storage/TaskStore";
import { LocalTaskStore } from "../storage/LocalTaskStore";

export interface TaskContextValue {
  tasks: Task[];
  addTask(draft: TaskDraft): Task;
  addTasks(parsed: ParsedTask[]): Task[];
  updateTask(id: string, patch: Partial<Task>): void;
  removeTask(id: string): void;
  toggleComplete(id: string): void;
  moveTask(id: string, view: "today" | "inbox"): void;
}

export const TaskContext = createContext<TaskContextValue | null>(null);

export function TaskStoreProvider({ store, children }: { store?: TaskStore; children: React.ReactNode }) {
  // Lazy singleton so the default LocalTaskStore is only constructed in the browser.
  const [active] = useState<TaskStore>(() => store ?? new LocalTaskStore());

  const [tasks, setTasks] = useState<Task[]>(() => active.load());

  const commit = useCallback(
    (next: Task[]) => {
      active.save(next);
      setTasks(next);
    },
    [active],
  );

  const addTask = useCallback(
    (draft: TaskDraft): Task => {
      const task = createTask(draft, { order: Date.now() });
      commit([...tasks, task]);
      return task;
    },
    [tasks, commit],
  );

  const addTasks = useCallback(
    (parsed: ParsedTask[]): Task[] => {
      const base = Date.now();
      const created = parsed.map((p, i) => createTask(p, { order: base + i }));
      commit([...tasks, ...created]);
      return created;
    },
    [tasks, commit],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => commit(tasks.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    [tasks, commit],
  );

  const removeTask = useCallback((id: string) => commit(tasks.filter((t) => t.id !== id)), [tasks, commit]);

  const toggleComplete = useCallback(
    (id: string) =>
      commit(
        tasks.map((t) =>
          t.id === id
            ? t.status === "active"
              ? { ...t, status: "done", completedAt: nowISO() }
              : { ...t, status: "active", completedAt: null }
            : t,
        ),
      ),
    [tasks, commit],
  );

  const moveTask = useCallback(
    (id: string, view: "today" | "inbox") =>
      commit(tasks.map((t) => (t.id === id ? { ...t, doDate: view === "today" ? todayISO() : null } : t))),
    [tasks, commit],
  );

  const value = useMemo<TaskContextValue>(
    () => ({ tasks, addTask, addTasks, updateTask, removeTask, toggleComplete, moveTask }),
    [tasks, addTask, addTasks, updateTask, removeTask, toggleComplete, moveTask],
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}
