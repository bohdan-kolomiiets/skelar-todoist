"use client";

import type { Task } from "@/lib/task/types";
import { cn } from "@/lib/cn";
import { Chip } from "./Chip";
import { PriorityFlag } from "./PriorityFlag";
import { TimeOfDayChip } from "./TimeOfDayChip";
import { DeadlineBadge } from "./DeadlineBadge";

interface Props {
  task: Task;
  today: string;
  onToggle(id: string): void;
  onOpen(task: Task): void;
  onMove(id: string, view: "today" | "inbox"): void;
  moveTarget: "today" | "inbox";
}

export function TaskRow({ task, today, onToggle, onOpen, onMove, moveTarget }: Props) {
  const done = task.status === "done";
  const hasMetas = task.deadline || task.timeOfDay || task.tags.length > 0;
  return (
    <div className="flex w-full items-center gap-3 border-b border-border py-3">
      <button
        type="button"
        aria-label={done ? "Completed" : "Complete"}
        onClick={() => onToggle(task.id)}
        className={cn(
          "h-5 w-5 flex-shrink-0 rounded-full border-[1.5px]",
          done ? "border-text-muted bg-text-muted text-surface-2" : "border-border-strong",
        )}
      >
        {done ? "✓" : ""}
      </button>

      <button type="button" onClick={() => onOpen(task)} className="flex-1 text-left">
        <span className={cn("flex flex-wrap items-center gap-1.5 text-[15px]", done && "text-text-muted line-through")}>
          {task.priority === "high" && !done && <PriorityFlag />}
          {task.time && <span className="text-[13px] text-text-secondary">{task.time}</span>}
          {task.title}
        </span>
        {hasMetas && !done && (
          <span className="mt-1 flex flex-wrap gap-1.5">
            {task.deadline && <DeadlineBadge deadline={task.deadline} today={today} />}
            {task.timeOfDay && <TimeOfDayChip value={task.timeOfDay} />}
            {task.tags.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </span>
        )}
      </button>

      <button
        type="button"
        aria-label={`Move to ${moveTarget}`}
        onClick={() => onMove(task.id, moveTarget)}
        className="flex-shrink-0 rounded-full border border-border px-2.5 py-1.5 text-xs text-text-secondary"
      >
        → {moveTarget === "today" ? "Today" : "Inbox"}
      </button>
    </div>
  );
}
