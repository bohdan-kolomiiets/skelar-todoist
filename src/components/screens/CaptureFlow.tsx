"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { IconWand, IconHelpCircle, IconMicrophone, IconSparkles } from "@tabler/icons-react";
import { DaysparkWordmark } from "@/components/brand/DaysparkWordmark";
import { TipsSheet } from "@/components/capture/TipsSheet";
import { VoiceComingSoonSheet } from "@/components/capture/VoiceComingSoonSheet";
import { LimitReachedSheet } from "@/components/billing/LimitReachedSheet";
import { SettingsGear } from "@/components/nav/SettingsGear";
import { useGatedOrganize } from "@/lib/ai/useGatedOrganize";
import { useTasks } from "@/lib/tasks/useTasks";
import { useAuth } from "@/lib/auth/useAuth";
import { useSaveNudge } from "@/lib/nudge/useSaveNudge";
import { LocalWaitlistService } from "@/lib/waitlist/LocalWaitlistService";
import type { ParsedTask } from "@/lib/task/types";
import { ReviewScreen } from "./ReviewScreen";

const EXAMPLE_DUMP =
  "Finish the pitch deck today, due Friday. Gym this evening. Reply to Anna — urgent. Someday read that design book.";
const PLACEHOLDER =
  "What's on your mind?\n\nGet everything out of your head — tasks, errands, deadlines. I'll sort it into your day.";

export function CaptureFlow() {
  const router = useRouter();
  const { addTasks, tasks } = useTasks();
  const { profile, markOrganized } = useAuth();
  const { notifySaved } = useSaveNudge();
  const { run, limitOpen, closeLimit, used, limit, isPro } = useGatedOrganize();
  const [text, setText] = useState("");
  const [proposal, setProposal] = useState<ParsedTask[] | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const firstRun = profile?.hasOrganizedOnce !== true;
  // The chip is a first-run affordance only — once any task exists (organized
  // OR manually added), it's no longer relevant even if hasOrganizedOnce is
  // still false.
  const showExampleChip = firstRun && tasks.length === 0;

  const waitlist = useMemo(() => new LocalWaitlistService(), []);

  async function planIt() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const out = await run(text);
      if (out.status === "blocked") return; // non-blocking: no parse runs, limit sheet already open
      if (out.status === "empty") {
        setNotice("I couldn't find any tasks in that — try rephrasing.");
        return;
      }
      if (out.status === "error") {
        setError(out.message);
        return;
      }
      markOrganized();
      setDegraded(out.degraded);
      setProposal(out.tasks);
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
          notifySaved();
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
      <header className="flex items-center justify-between pb-1">
        <DaysparkWordmark />
        <SettingsGear />
      </header>
      <div className="flex flex-1 flex-col rounded-xl border border-border bg-surface-1 p-3">
        {/* Chip in a normal-flow row (issue #4 #7) so it can never overlap the typed
            text — the old absolute+min-h-11 chip did. Wand icon per the mockup. */}
        {showExampleChip && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setText(EXAMPLE_DUMP)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border-strong bg-surface-2 px-2.5 py-1 text-xs"
            >
              <IconWand size={15} className="text-text-accent" aria-hidden />
              Try an example
            </button>
          </div>
        )}
        <textarea
          aria-label="Brain dump"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          className={`${showExampleChip ? "mt-1" : "mt-0"} min-h-44 flex-1 resize-none bg-transparent text-base leading-relaxed outline-none placeholder:text-text-muted`}
        />
        <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
          <button type="button" onClick={() => setTipsOpen(true)} className="inline-flex min-h-11 items-center gap-1.5 text-[13px] text-text-secondary">
            <IconHelpCircle size={15} aria-hidden />
            Tips
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                waitlist.recordInterest("voice");
                setVoiceOpen(true);
              }}
              aria-label="Voice input, coming soon"
              className="flex min-h-11 min-w-11 items-center justify-center text-text-disabled"
            >
              <IconMicrophone size={20} aria-hidden />
            </button>
            <button
              type="button"
              onClick={planIt}
              disabled={busy || !text.trim()}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-fill-accent px-4 py-2 text-[15px] font-medium text-on-accent disabled:opacity-50"
            >
              {busy ? "Planning…" : <>Plan it <IconSparkles size={17} aria-hidden /></>}
            </button>
          </div>
        </div>
      </div>
      {error && <p className="text-[13px] text-text-danger">{error}</p>}
      {notice && <p className="text-[13px] text-text-secondary">{notice}</p>}
      {!isPro && (
        <p className="text-[13px] text-text-muted">
          {Math.max(0, limit - used)} of {limit} AI plans left today
        </p>
      )}
      {firstRun && (
        <p className="text-[13px] text-text-secondary">
          Tip: say <em>when</em> — “today”, “tomorrow 3pm”, “gym this evening”, “report due Fri”.
        </p>
      )}
      <TipsSheet open={tipsOpen} onClose={() => setTipsOpen(false)} />
      {/* Mounted only while open (not always-mounted like TipsSheet/LimitReachedSheet) so
          each open is a fresh mount — the sheet's joined-state initializer genuinely
          re-reads storage every time, instead of running once at CaptureFlow mount. */}
      {voiceOpen && <VoiceComingSoonSheet open onClose={() => setVoiceOpen(false)} />}
      <LimitReachedSheet open={limitOpen} onClose={closeLimit} used={used} limit={limit} />
    </section>
  );
}
