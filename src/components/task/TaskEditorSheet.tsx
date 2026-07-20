"use client";

import { useState } from "react";
import type { Task, TaskDraft, TimeOfDay, Priority } from "@/lib/task/types";
import { TagsInput } from "./TagsInput";

interface Props {
  open: boolean;
  initial: Task | TaskDraft;
  title?: string;
  onClose(): void;
  onSave(draft: TaskDraft): void;
  onDelete?(): void;
}

export function TaskEditorSheet({ open, initial, title = "Edit task", onClose, onSave, onDelete }: Props) {
  const [draft, setDraft] = useState<TaskDraft>(() => ({
    title: initial.title ?? "",
    notes: initial.notes ?? null,
    doDate: initial.doDate ?? null,
    time: initial.time ?? null,
    timeOfDay: initial.timeOfDay ?? null,
    deadline: initial.deadline ?? null,
    priority: initial.priority ?? "none",
    tags: initial.tags ?? [],
  }));
  if (!open) return null;

  const set = <K extends keyof TaskDraft>(key: K, val: TaskDraft[K]) => setDraft((d) => ({ ...d, [key]: val }));
  const orNull = (v: string) => (v === "" ? null : v);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-2" role="dialog" aria-label={title}>
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <button type="button" onClick={onClose} aria-label="Close" className="text-text-secondary">✕</button>
        <span className="font-medium">{title}</span>
        <button type="button" onClick={() => onSave(draft)} className="font-medium text-text-accent">Done</button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <label className="block text-xs text-text-muted" htmlFor="ed-title">Title</label>
        <input id="ed-title" className="mb-3 w-full bg-transparent text-lg font-medium outline-none"
          value={draft.title} onChange={(e) => set("title", e.target.value)} />

        <label className="block text-xs text-text-muted" htmlFor="ed-notes">Notes</label>
        <input id="ed-notes" className="mb-4 w-full bg-transparent text-sm outline-none" placeholder="Add notes"
          value={draft.notes ?? ""} onChange={(e) => set("notes", orNull(e.target.value))} />

        <Row label="When" htmlFor="ed-when">
          <input id="ed-when" type="date" className="bg-transparent text-sm"
            value={draft.doDate ?? ""} onChange={(e) => set("doDate", orNull(e.target.value))} />
        </Row>
        <Row label="Time" htmlFor="ed-time">
          <input id="ed-time" type="time" className="bg-transparent text-sm"
            value={draft.time ?? ""} onChange={(e) => set("time", orNull(e.target.value))} />
        </Row>
        <Row label="Part of day" htmlFor="ed-tod">
          <select id="ed-tod" className="bg-transparent text-sm"
            value={draft.timeOfDay ?? ""} onChange={(e) => set("timeOfDay", (e.target.value || null) as TimeOfDay | null)}>
            <option value="">None</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
          </select>
        </Row>
        <Row label="Priority" htmlFor="ed-priority">
          <select id="ed-priority" className="bg-transparent text-sm"
            value={draft.priority} onChange={(e) => set("priority", e.target.value as Priority)}>
            <option value="none">None</option>
            <option value="high">Important</option>
          </select>
        </Row>
        <Row label="Deadline" htmlFor="ed-deadline">
          <input id="ed-deadline" type="date" className="bg-transparent text-sm"
            value={draft.deadline ?? ""} onChange={(e) => set("deadline", orNull(e.target.value))} />
        </Row>
        <div className="flex items-start gap-3 border-b border-border py-3">
          <span className="text-[15px]">Tags</span>
          <div className="ml-auto max-w-[70%]">
            <TagsInput value={draft.tags ?? []} onChange={(tags) => set("tags", tags)} />
          </div>
        </div>

        {onDelete && (
          <button type="button" onClick={onDelete} className="mt-5 text-sm text-text-danger">Delete task</button>
        )}
      </div>
    </div>
  );
}

function Row({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-border py-3">
      <label htmlFor={htmlFor} className="text-[15px]">{label}</label>
      <div className="ml-auto text-text-secondary">{children}</div>
    </div>
  );
}
