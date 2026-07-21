"use client";

import { useMemo, useState } from "react";
import { todayISO } from "@/lib/date/clock";
import type { ParsedTask, TaskDraft } from "@/lib/task/types";
import { Chip } from "@/components/task/Chip";
import { PriorityFlag } from "@/components/task/PriorityFlag";
import { TimeOfDayChip } from "@/components/task/TimeOfDayChip";
import { DeadlineBadge } from "@/components/task/DeadlineBadge";
import { TaskEditorSheet } from "@/components/task/TaskEditorSheet";

interface Props {
  proposal: ParsedTask[];
  onCommit(tasks: ParsedTask[]): void;
  onStartOver(): void;
}

export function ReviewScreen({ proposal, onCommit, onStartOver }: Props) {
  const today = todayISO();
  const [items, setItems] = useState<ParsedTask[]>(proposal);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const todays = useMemo(() => items.filter((t) => t.doDate === today), [items, today]);
  const inbox = useMemo(() => items.filter((t) => t.doDate !== today), [items, today]);

  const removeAt = (task: ParsedTask) => setItems((xs) => xs.filter((t) => t !== task));
  const togglePlacement = (task: ParsedTask) =>
    setItems((xs) => xs.map((t) => (t === task ? { ...t, doDate: t.doDate === today ? null : today } : t)));

  const card = (task: ParsedTask) => {
    const idx = items.indexOf(task);
    return (
      <div key={idx} className="rounded-xl border border-border bg-surface-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <button type="button" onClick={() => setEditingIndex(idx)} className="flex items-center gap-1.5 text-left text-[15px] font-medium">
            {task.priority === "high" && <PriorityFlag />}
            {task.title}
          </button>
          <button
            type="button"
            aria-label="Remove"
            onClick={() => removeAt(task)}
            className="flex min-h-11 min-w-11 flex-shrink-0 items-center justify-center text-text-muted"
          >
            ✕
          </button>
        </div>
        {(task.deadline || task.timeOfDay || (task.tags?.length ?? 0) > 0) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {task.deadline && <DeadlineBadge deadline={task.deadline} today={today} />}
            {task.timeOfDay && <TimeOfDayChip value={task.timeOfDay} />}
            {task.tags?.map((t) => <Chip key={t}>{t}</Chip>)}
          </div>
        )}
        <div className="mt-2.5">
          <button
            type="button"
            onClick={() => togglePlacement(task)}
            className="flex min-h-11 items-center rounded-full border border-border-strong bg-surface-1 px-2.5 text-xs"
          >
            {task.doDate === today ? "☀ Today ▾" : "📥 Inbox ▾"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="flex flex-1 flex-col">
      <header className="border-b border-border px-4 py-3">
        <p className="font-medium">Review your plan</p>
        <p className="text-xs text-text-secondary">
          {todays.length} for today, {inbox.length} for later — tap a task to edit
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-surface-1 px-3.5 py-3.5">
        {todays.length > 0 && <p className="text-[13px] text-text-secondary">☀ Today · {todays.length}</p>}
        {todays.map(card)}
        {inbox.length > 0 && <p className="mt-1.5 text-[13px] text-text-secondary">📥 Inbox · {inbox.length}</p>}
        {inbox.map(card)}
      </div>

      <div className="flex flex-col gap-2 border-t border-border px-4 pb-4 pt-3">
        <button
          type="button"
          onClick={() => onCommit(items)}
          disabled={items.length === 0}
          className="w-full rounded-xl bg-fill-accent py-3 text-base font-medium text-on-accent disabled:opacity-50"
        >
          Add {items.length} {items.length === 1 ? "task" : "tasks"}
        </button>
        <button type="button" onClick={onStartOver} className="self-center text-[13px] text-text-secondary">Start over</button>
      </div>

      {editingIndex !== null && (
        <TaskEditorSheet
          key={editingIndex}
          open
          title="Edit task"
          initial={items[editingIndex]}
          onClose={() => setEditingIndex(null)}
          onSave={(draft: TaskDraft) => {
            setItems((xs) => xs.map((t, i) => (i === editingIndex ? { ...t, ...draft } : t)));
            setEditingIndex(null);
          }}
        />
      )}
    </section>
  );
}
