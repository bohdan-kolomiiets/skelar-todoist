"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { getPreference, setPreference } from "./preferenceStore";

// Hydration-safe persistence, mirroring TaskStoreProvider: the server render and
// the client's first (hydration) render both see `defaultValue` (getServerSnapshot
// returns false), so the stored value can never desync the SSR markup. It's adopted
// during the render right after hydration commits — never from an effect, which keeps
// this project's `react-hooks/set-state-in-effect` lint rule satisfied.
const neverSubscribe = () => () => {};
const hydratedOnClient = () => true;
const hydratedOnServer = () => false;

/**
 * `useState` whose value survives reloads and tab switches by persisting to the
 * preference seam. Defaults are used until hydration, then the stored value (if any)
 * is adopted. Setter signature matches a plain `useState` setter's value form.
 */
export function usePersistentState<T>(key: string, defaultValue: T): [T, (next: T) => void] {
  const isHydrated = useSyncExternalStore(neverSubscribe, hydratedOnClient, hydratedOnServer);
  const [value, setValue] = useState<T>(defaultValue);
  const [hydrated, setHydrated] = useState(false);

  if (isHydrated && !hydrated) {
    setHydrated(true);
    const stored = getPreference<T>(key);
    if (stored !== undefined) setValue(stored);
  }

  const set = useCallback(
    (next: T) => {
      setValue(next);
      setPreference(key, next);
    },
    [key],
  );

  return [value, set];
}
