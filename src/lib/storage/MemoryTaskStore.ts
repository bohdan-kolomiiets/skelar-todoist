import type { Task } from "../task/types";
import type { TaskStore } from "./TaskStore";

/** In-memory store for tests and SSR-safe defaults. */
export class MemoryTaskStore implements TaskStore {
  private tasks: Task[];
  constructor(tasks: Task[] = []) {
    this.tasks = [...tasks];
  }
  load(): Task[] {
    return [...this.tasks];
  }
  save(tasks: Task[]): void {
    this.tasks = [...tasks];
  }
}
