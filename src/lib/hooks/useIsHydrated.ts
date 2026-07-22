"use client";

import { useSyncExternalStore } from "react";

// No external store to subscribe to; getServerSnapshot returns false so the server
// AND the client's first (hydration) render agree, then getSnapshot flips to true
// once hydration commits. See TaskStoreProvider for the original rationale.
const neverSubscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

/** True only after the client hydration render commits (SSR-safe). */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(neverSubscribe, onClient, onServer);
}
