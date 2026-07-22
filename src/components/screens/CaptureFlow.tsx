"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { IconWand, IconHelpCircle, IconMicrophone, IconSparkles } from "@tabler/icons-react";
import { DaysparkWordmark } from "@/components/brand/DaysparkWordmark";
import { TipsSheet } from "@/components/capture/TipsSheet";
import { VoiceComingSoonSheet } from "@/components/capture/VoiceComingSoonSheet";
import { LimitReachedSheet } from "@/components/billing/LimitReachedSheet";
import { SettingsGear } from "@/components/nav/SettingsGear";
import { organize } from "@/lib/ai/organizeClient";
import { useTasks } from "@/lib/tasks/useTasks";
import { useAuth } from "@/lib/auth/useAuth";
import { useSaveNudge } from "@/lib/nudge/useSaveNudge";
import { usePersistentState } from "@/lib/preferences/usePersistentState";
import { useIsHydrated } from "@/lib/hooks/useIsHydrated";
import { LocalUsageService, USAGE_KEY } from "@/lib/usage/LocalUsageService";
import { LocalWaitlistService } from "@/lib/waitlist/LocalWaitlistService";
import { profileKey } from "@/lib/profile/profileKey";
import { todayISO } from "@/lib/date/clock";
import type { ParsedTask } from "@/lib/task/types";
import { ReviewScreen } from "./ReviewScreen";

const EXAMPLE_DUMP =
  "Finish the pitch deck today, due Friday. Gym this evening. Reply to Anna — urgent. Someday read that design book.";
const PLACEHOLDER =
  "What's on your mind?\n\nGet everything out of your head — tasks, errands, deadlines. I'll sort it into your day.";

export function CaptureFlow() {
  const router = useRouter();
  const { addTasks } = useTasks();
  const { profile, isPro, markOrganized } = useAuth();
  const { notifySaved } = useSaveNudge();
  const [text, setText] = useState("");
  const [proposal, setProposal] = useState<ParsedTask[] | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const firstRun = profile?.hasOrganizedOnce !== true;

  const waitlist = useMemo(() => new LocalWaitlistService(), []);

  const today = todayISO();
  const usage = useMemo(
    () => new LocalUsageService(profileKey(USAGE_KEY, profile?.id ?? "guest")),
    [profile?.id],
  );
  // freeDailyInputs — an admin-config value, not per-profile — persisted via the
  // preference seam so a fresh mount (reload, new tab, back navigation) knows the
  // real limit immediately instead of assuming the hardcoded default of 3. Without
  // this, the pre-organize gate below under-counts on every remount — e.g. with a
  // configured limit of 1, a returning user whose local state reset to the default
  // of 3 would sail past the gate and trigger an extra, unbudgeted organize() call
  // before the server's echoed freeDailyInputs corrected it. usePersistentState is
  // itself hydration-safe (defaults to 3 through the first/hydration render, then
  // adopts the stored value), so this can't desync from the server-sent markup.
  const [limit, setLimit] = usePersistentState<number>("freeDailyInputs", 3);

  // today's count, for the "N left" display + limit sheet. Hydration-safe like
  // `limit`/`isHydrated` above: `usage.count(today)` reads localStorage, which would
  // desync SSR (no localStorage → 0) from a returning user's real client-side count
  // if read directly during render, so it's adopted once, right after hydration
  // commits, via the same during-render pattern as TaskStoreProvider/AuthProvider.
  // Adopted only that once and then re-synced solely inside planIt() — correct only
  // because sign-in (SaveNudgeSheet, on Today/Inbox) and upgrade (/plans) both
  // remount Capture on return; an in-place sign-in/upgrade without leaving Capture
  // would need `used` re-synced too.
  const isHydrated = useIsHydrated();
  const [used, setUsed] = useState(0);
  const [usedHydrated, setUsedHydrated] = useState(false);
  if (isHydrated && !usedHydrated) {
    setUsedHydrated(true);
    setUsed(usage.count(today));
  }
  const [limitOpen, setLimitOpen] = useState(false);

  async function planIt() {
    if (!isPro && usage.remaining(today, limit) <= 0) {
      setUsed(usage.count(today));
      setLimitOpen(true);
      return; // non-blocking: no parse runs
    }
    setBusy(true);
    setError(null);
    try {
      const { tasks, degraded, freeDailyInputs } = await organize(text);
      setLimit(freeDailyInputs);
      if (!isPro) {
        usage.increment(today);
        setUsed(usage.count(today));
      }
      if (tasks.length > 0) markOrganized();
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
        {firstRun && (
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
          className="mt-1 min-h-44 flex-1 resize-none bg-transparent text-base leading-relaxed outline-none placeholder:text-text-muted"
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
      <LimitReachedSheet open={limitOpen} onClose={() => setLimitOpen(false)} used={used} limit={limit} />
    </section>
  );
}
