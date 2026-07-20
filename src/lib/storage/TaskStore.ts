import type { Task } from "../task/types";

/** Swappable persistence seam (PRODUCT §17). A real backend implements the same shape. */
export interface TaskStore {
  load(): Task[];
  save(tasks: Task[]): void;
}
