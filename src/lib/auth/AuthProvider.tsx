"use client";

import { createContext, useCallback, useMemo, useState, useSyncExternalStore } from "react";
import type { AuthService, Profile, Tier } from "./types";
import { LocalAuthService } from "./LocalAuthService";

export interface AuthContextValue {
  profile: Profile | null;
  startGuest(): void;
  signIn(input: { emailOrName: string }): void;
  signOut(): void;
  markOrganized(): void;
  markSaved(): void;
  setTier(tier: Tier): void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const neverSubscribe = () => () => {};
const getIsHydratedOnClient = () => true;
const getIsHydratedOnServer = () => false;

export function AuthProvider({ service, children }: { service?: AuthService; children: React.ReactNode }) {
  const [active] = useState<AuthService>(() => service ?? new LocalAuthService());
  const isHydrated = useSyncExternalStore(neverSubscribe, getIsHydratedOnClient, getIsHydratedOnServer);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load the real profile exactly once, right after hydration commits (no effect setState).
  // Hydration-safe load (see TaskStoreProvider.tsx for the full rationale): never setState in an effect (react-hooks/set-state-in-effect).
  if (isHydrated && !loaded) {
    setLoaded(true);
    setProfile(active.current());
  }

  const refresh = useCallback(() => setProfile(active.current()), [active]);

  const startGuest = useCallback(() => { active.startGuest(); refresh(); }, [active, refresh]);
  const signIn = useCallback((input: { emailOrName: string }) => { active.signIn(input); refresh(); }, [active, refresh]);
  const signOut = useCallback(() => { active.signOut(); refresh(); }, [active, refresh]);
  const markOrganized = useCallback(() => { active.markOrganized(); refresh(); }, [active, refresh]);
  const markSaved = useCallback(() => { active.markSaved(); refresh(); }, [active, refresh]);
  const setTier = useCallback((tier: Tier) => { active.setTier(tier); refresh(); }, [active, refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({ profile, startGuest, signIn, signOut, markOrganized, markSaved, setTier }),
    [profile, startGuest, signIn, signOut, markOrganized, markSaved, setTier],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
