export type Priority = "high" | "medium" | "low" | "none";
export type TimeOfDay = "morning" | "afternoon" | "evening";
export type TaskStatus = "active" | "done";

/** The parseable fields the AI returns (PRODUCT §3 output contract). */
export interface ParsedTask {
  title: string;
  notes?: string | null;
  doDate?: string | null; // "YYYY-MM-DD"
  time?: string | null; // "HH:mm"
  timeOfDay?: TimeOfDay | null;
  deadline?: string | null; // "YYYY-MM-DD"
  priority?: Priority;
  tags?: string[];
  /** Additive: ambiguous item the parser couldn't date (PRODUCT §4/§7). */
  needsDate?: boolean;
}

/** Editable fields for manual add / the editor. */
export type TaskDraft = ParsedTask;

/** The full task the app persists and renders (PRODUCT §3 schema). */
export interface Task {
  id: string;
  title: string;
  notes: string | null;
  doDate: string | null;
  time: string | null;
  timeOfDay: TimeOfDay | null;
  deadline: string | null;
  priority: Priority;
  tags: string[];
  status: TaskStatus;
  createdAt: string; // ISO
  completedAt: string | null;
  order: number;
  /** Additive: ambiguous item the parser couldn't date (PRODUCT §4/§7). */
  needsDate?: boolean;
}
