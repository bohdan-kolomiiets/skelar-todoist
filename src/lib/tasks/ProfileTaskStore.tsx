"use client";

import { useMemo } from "react";
import { useAuth } from "../auth/useAuth";
import { LocalTaskStore, TASKS_KEY } from "../storage/LocalTaskStore";
import { profileKey } from "../profile/profileKey";
import { TaskStoreProvider } from "./TaskStoreProvider";

/**
 * Bridges the active profile to the task store: each profile gets its own
 * localStorage bucket, and switching profiles remounts the provider (via `key`)
 * so it reloads the new (copied-on-sign-in) bucket. Pre-guest falls back to the
 * guest namespace.
 */
export function ProfileTaskStore({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const id = profile?.id ?? "guest";
  const store = useMemo(() => new LocalTaskStore(profileKey(TASKS_KEY, id)), [id]);
  return (
    <TaskStoreProvider key={id} store={store}>
      {children}
    </TaskStoreProvider>
  );
}
