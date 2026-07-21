export type Tier = "guest" | "free" | "pro";

export interface Profile {
  id: string; // "guest" for the anonymous profile; a uuid for signed-in profiles
  tier: Tier;
  name?: string;
  email?: string;
  hasOrganizedOnce: boolean; // first-run gating source of truth (PRODUCT §13)
  hasSavedOnce: boolean; // guest→free nudge fires once (PRODUCT §12)
  createdAt: string; // ISO
}

/** Persisted registry: the active-profile pointer + all profile records. Global (not per-profile). */
export interface Registry {
  activeId: string | null;
  profiles: Record<string, Profile>;
}

/** Swappable identity seam. A real backend implements the same shape. */
export interface AuthService {
  current(): Profile | null; // null = pre-guest (show Welcome)
  startGuest(): Profile;
  signIn(input: { emailOrName: string }): Profile; // mint a free profile, copy guest bucket into it
  signOut(): void;
  markOrganized(): void;
  markSaved(): void;
  setTier(tier: Tier): void;
}
