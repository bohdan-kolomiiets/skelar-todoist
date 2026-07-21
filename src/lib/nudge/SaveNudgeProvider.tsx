"use client";

import { createContext, useCallback, useMemo, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { SaveNudgeSheet } from "@/components/auth/SaveNudgeSheet";

export interface SaveNudgeValue {
  notifySaved(): void;
}

export const SaveNudgeContext = createContext<SaveNudgeValue | null>(null);

/** Fires the guest→free "save your plan" nudge once, after a guest's first save. */
export function SaveNudgeProvider({ children }: { children: React.ReactNode }) {
  const { profile, markSaved, signIn } = useAuth();
  const [open, setOpen] = useState(false);

  const notifySaved = useCallback(() => {
    if (profile?.tier === "guest" && !profile.hasSavedOnce) {
      markSaved();
      setOpen(true);
    }
  }, [profile, markSaved]);

  const value = useMemo<SaveNudgeValue>(() => ({ notifySaved }), [notifySaved]);

  return (
    <SaveNudgeContext.Provider value={value}>
      {children}
      <SaveNudgeSheet
        open={open}
        onClose={() => setOpen(false)}
        onSignIn={(emailOrName) => {
          signIn({ emailOrName });
          setOpen(false);
        }}
      />
    </SaveNudgeContext.Provider>
  );
}
