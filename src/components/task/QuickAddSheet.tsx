"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { LimitReachedSheet } from "@/components/billing/LimitReachedSheet";
import { TaskEditorSheet } from "./TaskEditorSheet";
import { ReviewScreen } from "@/components/screens/ReviewScreen";
import { useGatedOrganize } from "@/lib/ai/useGatedOrganize";
import { useTasks } from "@/lib/tasks/useTasks";
import type { ParsedTask, TaskDraft } from "@/lib/task/types";

type Stage =
  | { kind: "input" }
  | { kind: "editor"; initial: TaskDraft }
  | { kind: "review"; proposal: ParsedTask[] };

export function QuickAddSheet({
  open,
  onClose,
  defaultDoDate,
}: {
  open: boolean;
  onClose(): void;
  defaultDoDate: string | null;
}) {
  const { addTask, addTasks } = useTasks();
  const { run, limitOpen, closeLimit, used, limit, isPro } = useGatedOrganize();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>({ kind: "input" });

  const done = () => {
    setText("");
    setNotice(null);
    setStage({ kind: "input" });
    onClose();
  };

  async function parse() {
    setBusy(true);
    setNotice(null);
    const out = await run(text);
    setBusy(false);
    if (out.status === "blocked") return;
    if (out.status === "empty") {
      setNotice("I couldn't find any tasks in that — try rephrasing.");
      return;
    }
    if (out.status === "error") {
      setNotice(out.message);
      return;
    }
    if (out.tasks.length === 1) setStage({ kind: "editor", initial: out.tasks[0] });
    else setStage({ kind: "review", proposal: out.tasks });
  }

  if (stage.kind === "editor") {
    return (
      <TaskEditorSheet
        open
        title="New task"
        initial={stage.initial}
        onClose={done}
        onSave={(draft) => {
          addTask(draft);
          done();
        }}
      />
    );
  }
  if (stage.kind === "review") {
    return (
      <ReviewScreen
        proposal={stage.proposal}
        onCommit={(tasks) => {
          addTasks(tasks);
          done();
        }}
        onStartOver={() => setStage({ kind: "input" })}
      />
    );
  }

  return (
    <>
      {/* Dialog aria-label is distinct from the textarea's "New task" aria-label
          (and from the editor's dialog title "New task") so getByLabelText/getByRole
          queries for the field vs. the sheet vs. the editor don't collide. */}
      <BottomSheet open={open} onClose={done} ariaLabel="Add a task">
        <h2 className="text-lg font-medium">New task</h2>
        <p className="mt-0.5 text-[13px] text-text-secondary">
          One task opens the editor · several open Review.
        </p>
        <textarea
          aria-label="New task"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What needs doing? I'll sort the date, time, priority…"
          className="mt-3 min-h-24 w-full resize-none rounded-lg border border-border bg-surface-2 p-3 text-base outline-none"
        />
        {notice && <p className="mt-1 text-[13px] text-text-secondary">{notice}</p>}
        {!isPro && (
          <p className="mt-2 text-[13px] text-text-muted">
            {Math.max(0, limit - used)} of {limit} AI plans left today
          </p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStage({ kind: "editor", initial: { title: "", doDate: defaultDoDate, tags: [] } })}
            className="min-h-11 text-[15px] text-text-secondary"
          >
            Enter manually
          </button>
          <button
            type="button"
            onClick={parse}
            disabled={busy || !text.trim()}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-fill-accent px-4 text-[15px] font-medium text-on-accent disabled:opacity-50"
          >
            {busy ? "Parsing…" : "Parse with AI"}
          </button>
        </div>
      </BottomSheet>
      <LimitReachedSheet open={limitOpen} onClose={closeLimit} used={used} limit={limit} />
    </>
  );
}
