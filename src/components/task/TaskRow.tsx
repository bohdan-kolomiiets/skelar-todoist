"use client";

import type { Task } from "@/lib/task/types";
import { cn } from "@/lib/cn";
import { IconCheck, IconArrowRight } from "@tabler/icons-react";
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
  trailing?: React.ReactNode;
}

export function TaskRow({ task, today, onToggle, onOpen, onMove, moveTarget, trailing }: Props) {
  const done = task.status === "done";
  const hasMetas = task.deadline || task.timeOfDay || task.tags.length > 0;
  return (
    <div className="flex w-full items-center gap-3 border-b border-border py-3">
      <button
        type="button"
        aria-label={done ? "Completed" : "Complete"}
        onClick={() => onToggle(task.id)}
        className="-ml-3 flex h-11 w-11 flex-shrink-0 items-center justify-center"
      >
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] text-[11px]",
            done ? "border-text-muted bg-text-muted text-surface-2" : "border-border-strong",
          )}
        >
          {done ? <IconCheck size={13} aria-hidden /> : null}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onOpen(task)}
        aria-label={`Open ${task.title}`}
        className="flex-1 text-left"
      >
        <span aria-hidden className={cn("flex flex-wrap items-center gap-1.5 text-[15px]", done && "text-text-muted line-through")}>
          {task.priority === "high" && !done && <PriorityFlag />}
          {task.time && <span className="text-[13px] text-text-secondary">{task.time}</span>}
          {task.title}
        </span>
        {hasMetas && !done && (
          <span aria-hidden className="mt-1 flex flex-wrap gap-1.5">
            {task.deadline && <DeadlineBadge deadline={task.deadline} today={today} />}
            {task.timeOfDay && <TimeOfDayChip value={task.timeOfDay} />}
            {task.tags.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </span>
        )}
      </button>

      {trailing && <span className="flex-shrink-0">{trailing}</span>}

      <button
        type="button"
        aria-label={`Move to ${moveTarget}`}
        onClick={() => onMove(task.id, moveTarget)}
        className="flex min-h-11 flex-shrink-0 items-center rounded-full border border-border px-3 text-xs text-text-secondary"
      >
        <IconArrowRight size={14} aria-hidden /> {moveTarget === "today" ? "Today" : "Inbox"}
      </button>
    </div>
  );
}
