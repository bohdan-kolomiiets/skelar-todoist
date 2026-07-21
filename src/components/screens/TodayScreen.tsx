"use client";

import { useMemo, useState } from "react";
import { useTasks } from "@/lib/tasks/useTasks";
import { viewOf } from "@/lib/task/routing";
import { groupToday } from "@/lib/task/ordering";
import { todayISO } from "@/lib/date/clock";
import { formatFullDate } from "@/lib/date/format";
import type { Task, TaskDraft } from "@/lib/task/types";
import { TaskRow } from "@/components/task/TaskRow";
import { TaskEditorSheet } from "@/components/task/TaskEditorSheet";

const SECTIONS: Array<["overdue" | "morning" | "afternoon" | "evening" | "anytime", string]> = [
  ["overdue", "Overdue"],
  ["morning", "Morning"],
  ["afternoon", "Afternoon"],
  ["evening", "Evening"],
  ["anytime", "Anytime"],
];

export function TodayScreen() {
  const { tasks, addTask, updateTask, removeTask, toggleComplete, moveTask } = useTasks();
  const today = todayISO();
  const [editing, setEditing] = useState<Task | "new" | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const todays = useMemo(() => tasks.filter((t) => viewOf(t, today) === "today"), [tasks, today]);
  const active = useMemo(() => todays.filter((t) => t.status === "active"), [todays]);
  const completed = useMemo(() => todays.filter((t) => t.status === "done"), [todays]);
  const groups = useMemo(() => groupToday(active, today), [active, today]);
  const hasInbox = tasks.some((t) => t.status === "active" && viewOf(t, today) === "inbox");

  const rowProps = (task: Task) => ({
    task, today, onToggle: toggleComplete, onOpen: setEditing, onMove: moveTask, moveTarget: "inbox" as const,
  });

  return (
    <section className="flex flex-1 flex-col px-4 pb-3">
      <header className="pb-2 pt-4">
        <h1 className="text-xl font-medium">Today</h1>
        <p className="mt-0.5 text-[13px] text-text-secondary">
          {formatFullDate(today)} · {completed.length} of {todays.length} done
        </p>
      </header>

      {todays.length === 0 ? (
        <p className="mt-10 text-center text-text-secondary">
          Nothing planned — capture your thoughts{hasInbox ? " or pull from Inbox" : ""}
        </p>
      ) : (
        SECTIONS.map(([key, label]) =>
          groups[key].length ? (
            <div key={key}>
              <p className={`mb-0.5 mt-3.5 text-[13px] font-medium ${key === "overdue" ? "text-text-danger" : "text-text-secondary"}`}>{label}</p>
              {groups[key].map((task) => (
                <TaskRow key={task.id} {...rowProps(task)} />
              ))}
            </div>
          ) : null,
        )
      )}

      <button type="button" onClick={() => setEditing("new")} className="mt-2 flex w-full items-center gap-2.5 min-h-11 py-3 text-left text-sm text-text-secondary">
        + Add task
      </button>

      {completed.length > 0 && (
        <div className="mt-2 border-t border-border pt-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-text-secondary">Completed · {completed.length}</span>
            <button type="button" onClick={() => setShowCompleted((s) => !s)} className="text-[13px] text-text-accent">
              {showCompleted ? "Hide" : "Show"}
            </button>
          </div>
          {showCompleted && completed.map((task) => <TaskRow key={task.id} {...rowProps(task)} />)}
        </div>
      )}

      {editing && (
        <TaskEditorSheet
          key={editing === "new" ? "new" : editing.id}
          open
          title={editing === "new" ? "New task" : "Edit task"}
          initial={editing === "new" ? { title: "", doDate: today, tags: [] } : editing}
          onClose={() => setEditing(null)}
          onSave={(draft: TaskDraft) => {
            if (editing === "new") addTask(draft);
            else updateTask(editing.id, draft);
            setEditing(null);
          }}
          onDelete={editing !== "new" ? () => { removeTask(editing.id); setEditing(null); } : undefined}
        />
      )}
    </section>
  );
}
