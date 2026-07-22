"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { LocalUsageService, USAGE_KEY } from "@/lib/usage/LocalUsageService";
import { profileKey } from "@/lib/profile/profileKey";
import { todayISO } from "@/lib/date/clock";
import { usePersistentState } from "@/lib/preferences/usePersistentState";
import { useIsHydrated } from "@/lib/hooks/useIsHydrated";
import { organize } from "./organizeClient";
import type { ParsedTask } from "@/lib/task/types";

export type OrganizeOutcome =
  | { status: "ok"; tasks: ParsedTask[]; degraded: boolean }
  | { status: "blocked" }
  | { status: "empty" }
  | { status: "error"; message: string };

/**
 * M2 metering gate + organize call, shared by every entry point that turns free
 * text into tasks (Capture now, quick-add later). Pre-checks remaining budget
 * before parsing (a blocked call never reaches organize()), then on success
 * increments the non-Pro usage counter and echoes the server's freeDailyInputs
 * limit back into the persisted preference — see CaptureFlow's original comments
 * (now moved here) for why `limit`/`used` must be hydration-safe.
 */
export function useGatedOrganize() {
  const { profile, isPro } = useAuth();
  const today = todayISO();
  const usage = useMemo(
    () => new LocalUsageService(profileKey(USAGE_KEY, profile?.id ?? "guest")),
    [profile?.id],
  );
  const [limit, setLimit] = usePersistentState<number>("freeDailyInputs", 3);
  const isHydrated = useIsHydrated();
  const [used, setUsed] = useState(0);
  const [usedHydrated, setUsedHydrated] = useState(false);
  if (isHydrated && !usedHydrated) {
    setUsedHydrated(true);
    setUsed(usage.count(today));
  }
  const [limitOpen, setLimitOpen] = useState(false);

  async function run(text: string): Promise<OrganizeOutcome> {
    if (!isPro && usage.remaining(today, limit) <= 0) {
      setUsed(usage.count(today));
      setLimitOpen(true);
      return { status: "blocked" }; // non-blocking: no parse runs
    }
    try {
      const { tasks, degraded, freeDailyInputs } = await organize(text);
      setLimit(freeDailyInputs);
      if (!isPro) {
        usage.increment(today);
        setUsed(usage.count(today));
      }
      if (tasks.length === 0) return { status: "empty" };
      return { status: "ok", tasks, degraded };
    } catch (e) {
      return { status: "error", message: (e as Error).message };
    }
  }

  return { run, limitOpen, closeLimit: () => setLimitOpen(false), used, limit, isPro };
}
