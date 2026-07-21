"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { organize } from "@/lib/ai/organizeClient";
import { useTasks } from "@/lib/tasks/useTasks";
import type { ParsedTask } from "@/lib/task/types";
import { ReviewScreen } from "./ReviewScreen";

const EXAMPLE_DUMP =
  "Finish the pitch deck today, due Friday. Gym this evening. Reply to Anna — urgent. Someday read that design book.";
const PLACEHOLDER =
  "What's on your mind?\n\nGet everything out of your head — tasks, errands, deadlines. I'll sort it into your day.";

export function CaptureFlow() {
  const router = useRouter();
  const { addTasks } = useTasks();
  const [text, setText] = useState("");
  const [proposal, setProposal] = useState<ParsedTask[] | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function planIt() {
    setBusy(true);
    setError(null);
    try {
      const { tasks, degraded } = await organize(text);
      setDegraded(degraded);
      setProposal(tasks);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (proposal) {
    return (
      <ReviewScreen
        proposal={proposal}
        degraded={degraded}
        onCommit={(tasks) => {
          addTasks(tasks);
          router.push("/today");
        }}
        onStartOver={() => {
          // Keep `text` — the user may want to tweak the dump and re-run (issue #4 P2).
          setProposal(null);
          setDegraded(false);
        }}
      />
    );
  }

  return (
    <section className="flex flex-1 flex-col gap-2.5 px-4 py-4">
      <div className="relative flex flex-1 flex-col rounded-xl border border-border bg-surface-1 p-3">
        <button
          type="button"
          onClick={() => setText(EXAMPLE_DUMP)}
          className="absolute right-2 top-2 min-h-11 rounded-full border border-border-strong bg-surface-2 px-2.5 py-1 text-xs"
        >
          ✨ Try an example
        </button>
        <textarea
          aria-label="Brain dump"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          className="mt-8 min-h-44 flex-1 resize-none bg-transparent text-base leading-relaxed outline-none placeholder:text-text-muted"
        />
        <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
          <button type="button" className="min-h-11 text-[13px] text-text-secondary">Tips</button>
          <div className="flex items-center gap-3">
            <button type="button" disabled aria-label="Voice input, coming soon" className="text-text-disabled">🎙️</button>
            <button
              type="button"
              onClick={planIt}
              disabled={busy || !text.trim()}
              className="min-h-11 rounded-full bg-fill-accent px-4 py-2 text-[15px] font-medium text-on-accent disabled:opacity-50"
            >
              {busy ? "Planning…" : "Plan it →"}
            </button>
          </div>
        </div>
      </div>
      {error && <p className="text-[13px] text-text-danger">{error}</p>}
      <p className="text-[13px] text-text-secondary">
        Tip: say <em>when</em> — “today”, “tomorrow 3pm”, “gym this evening”, “report due Fri”.
      </p>
    </section>
  );
}
