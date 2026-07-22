"use client";

import { useCallback, useState } from "react";
import { getPreference, setPreference } from "./preferenceStore";
import { useIsHydrated } from "../hooks/useIsHydrated";

/**
 * `useState` whose value survives reloads and tab switches by persisting to the
 * preference seam. Defaults are used until hydration, then the stored value (if any)
 * is adopted. Setter signature matches a plain `useState` setter's value form.
 */
export function usePersistentState<T>(key: string, defaultValue: T): [T, (next: T) => void] {
  const isHydrated = useIsHydrated();
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
