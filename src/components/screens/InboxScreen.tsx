"use client";

import { useMemo, useState } from "react";
import { useTasks } from "@/lib/tasks/useTasks";
import { viewOf } from "@/lib/task/routing";
import { groupInbox } from "@/lib/task/ordering";
import { todayISO } from "@/lib/date/clock";
import { formatDoDate } from "@/lib/date/format";
import type { Task, TaskDraft } from "@/lib/task/types";
import { TaskRow } from "@/components/task/TaskRow";
import { Chip } from "@/components/task/Chip";
import { TaskEditorSheet } from "@/components/task/TaskEditorSheet";

export function InboxScreen() {
  const { tasks, addTask, updateTask, removeTask, toggleComplete, moveTask } = useTasks();
  const today = todayISO();
  const [editing, setEditing] = useState<Task | "new" | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const inboxAll = useMemo(() => tasks.filter((t) => viewOf(t, today) === "inbox"), [tasks, today]);
  const active = useMemo(() => inboxAll.filter((t) => t.status === "active"), [inboxAll]);
  const completed = useMemo(() => inboxAll.filter((t) => t.status === "done"), [inboxAll]);
  const { scheduled, someday } = useMemo(() => groupInbox(active, today), [active, today]);

  const rowProps = (task: Task) => ({
    task, today, onToggle: toggleComplete, onOpen: setEditing, onMove: moveTask, moveTarget: "today" as const,
  });

  return (
    <section className="flex flex-1 flex-col px-4 pb-3">
      <header className="pb-2 pt-4">
        <h1 className="text-xl font-medium">Inbox</h1>
        <p className="mt-0.5 text-[13px] text-text-secondary">{active.length} waiting</p>
      </header>

      {inboxAll.length === 0 ? (
        <p className="mt-10 text-center text-text-secondary">Inbox zero — nothing waiting, capture your thoughts</p>
      ) : (
        <>
          {scheduled.length > 0 && (
            <div>
              <p className="mb-0.5 mt-3.5 text-[13px] font-medium text-text-secondary">Scheduled · {scheduled.length}</p>
              {scheduled.map((task) => (
                <TaskRow
                  key={task.id}
                  {...rowProps(task)}
                  trailing={task.doDate ? <Chip>{formatDoDate(task.doDate, today)}</Chip> : undefined}
                />
              ))}
            </div>
          )}
          {someday.length > 0 && (
            <div>
              <p className="mb-0.5 mt-3.5 text-[13px] font-medium text-text-secondary">Someday · {someday.length}</p>
              {someday.map((task) => (
                <TaskRow key={task.id} {...rowProps(task)} />
              ))}
            </div>
          )}
        </>
      )}

      <button type="button" onClick={() => setEditing("new")} className="mt-2 flex min-h-11 w-full items-center gap-2.5 py-3 text-left text-sm text-text-secondary">
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
          initial={editing === "new" ? { title: "", doDate: null, tags: [] } : editing}
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
