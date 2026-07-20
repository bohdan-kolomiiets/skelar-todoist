import type { Task } from "../task/types";
import type { TaskStore } from "./TaskStore";

const DEFAULT_KEY = "planner.tasks.v1";

/** localStorage-backed store. Tolerates missing/corrupt data by returning []. */
export class LocalTaskStore implements TaskStore {
  constructor(private key: string = DEFAULT_KEY) {}

  load(): Task[] {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(this.key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Task[]) : [];
    } catch {
      return [];
    }
  }

  save(tasks: Task[]): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(this.key, JSON.stringify(tasks));
  }
}
