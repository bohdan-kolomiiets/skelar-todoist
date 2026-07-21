"use client";

import { createContext, useCallback, useMemo, useState, useSyncExternalStore } from "react";
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

// There's no external source to subscribe to (the store only ever changes
// through our own commit() calls below), so `subscribe` is a permanent no-op.
// This useSyncExternalStore is used purely to learn, in a hydration-safe way,
// whether the client's hydration render has already committed:
// getServerSnapshot's `false` is what both the server AND the client's first
// (hydration) render see, so it can never desync from the server-sent markup;
// it flips to `true` (getSnapshot) only once hydration has committed.
const neverSubscribe = () => () => {};
const getIsHydratedOnClient = () => true;
const getIsHydratedOnServer = () => false;

export function TaskStoreProvider({ store, children }: { store?: TaskStore; children: React.ReactNode }) {
  // Lazy singleton (constructed once). useState lazy-init keeps this lint-clean
  // vs. mutating a ref during render. The default LocalTaskStore's constructor
  // is SSR-safe (it never touches localStorage until load()/save()).
  const [active] = useState<TaskStore>(() => store ?? new LocalTaskStore());

  const isHydrated = useSyncExternalStore(neverSubscribe, getIsHydratedOnClient, getIsHydratedOnServer);

  // Start empty so the server render and the client's first (hydration) render
  // agree — LocalTaskStore.load() returns [] on the server but real data in the
  // browser, so reading it during the initial render would mismatch hydration.
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksHydrated, setTasksHydrated] = useState(false);

  // Adjust state during render (React-sanctioned alternative to an effect for
  // this exact case — see "You Might Not Need an Effect":
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  // This runs exactly once, right after `isHydrated` flips to true, and — unlike
  // `useEffect(() => setTasks(active.load()), [])` — never calls setState from
  // inside an effect body, which is what this project's `react-hooks/set-state-in-effect`
  // lint rule flags as a cascading-render smell.
  if (isHydrated && !tasksHydrated) {
    setTasksHydrated(true);
    setTasks(active.load());
  }

  // Persist + set in one step, deriving the next state from the FRESHEST state
  // via the functional update form — so two mutations in the same tick cannot
  // overwrite each other (no stale-closure data loss).
  const commit = useCallback(
    (update: (prev: Task[]) => Task[]) => {
      setTasks((prev) => {
        const next = update(prev);
        active.save(next);
        return next;
      });
    },
    [active],
  );

  const addTask = useCallback(
    (draft: TaskDraft): Task => {
      const task = createTask(draft, { order: Date.now() });
      commit((prev) => [...prev, task]);
      return task;
    },
    [commit],
  );

  const addTasks = useCallback(
    (parsed: ParsedTask[]): Task[] => {
      const base = Date.now();
      const created = parsed.map((p, i) => createTask(p, { order: base + i }));
      commit((prev) => [...prev, ...created]);
      return created;
    },
    [commit],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => commit((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    [commit],
  );

  const removeTask = useCallback((id: string) => commit((prev) => prev.filter((t) => t.id !== id)), [commit]);

  const toggleComplete = useCallback(
    (id: string) =>
      commit((prev) =>
        prev.map((t) =>
          t.id === id
            ? t.status === "active"
              ? { ...t, status: "done", completedAt: nowISO() }
              : { ...t, status: "active", completedAt: null }
            : t,
        ),
      ),
    [commit],
  );

  const moveTask = useCallback(
    (id: string, view: "today" | "inbox") =>
      commit((prev) => prev.map((t) => (t.id === id ? { ...t, doDate: view === "today" ? todayISO() : null } : t))),
    [commit],
  );

  const value = useMemo<TaskContextValue>(
    () => ({ tasks, addTask, addTasks, updateTask, removeTask, toggleComplete, moveTask }),
    [tasks, addTask, addTasks, updateTask, removeTask, toggleComplete, moveTask],
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}
