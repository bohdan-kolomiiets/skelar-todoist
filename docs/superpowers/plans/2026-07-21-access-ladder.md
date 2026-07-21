# Access Ladder & Conversion Funnel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the faked **guest → free → pro** conversion funnel — land as an anonymous guest, get nudged to sign in on the first Save, hit a daily AI limit, fake-upgrade to Pro — behind swappable `localStorage` services so a real backend drops in without touching UI.

**Architecture:** Four small `src/lib` service interfaces (`AuthService`, `UsageService`, `BillingService`, `WaitlistService`), each `localStorage`-backed, mirroring the existing `TaskStore`/`TaskStoreProvider` seam. A `profileKey(base, id)` helper namespaces every per-profile bucket; `signIn` copies the guest bucket into a new user bucket (**Approach A**). `AuthProvider`/`useAuth` bridge auth to UI reactively; the task store is remounted per profile so sign-in reloads the copied bucket. Three conversion moments (first-run gating, guest→free save nudge, free→pro limit gate) are non-blocking overlays; the underlying task action always completes first.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Vitest + React Testing Library (unit/component) · Playwright (e2e) · `@vercel/edge-config` (already installed, for `freeDailyInputs`).

**Design spec:** [docs/superpowers/specs/2026-07-21-access-ladder-design.md](../specs/2026-07-21-access-ladder-design.md).

## Global Constraints

_Every task's requirements implicitly include this section. Values copied verbatim from the spec / PRODUCT.md._

- **Everything faked + swappable** — no real accounts, passwords, payments, or sync. Each seam is a `localStorage` implementation behind a small `src/lib` interface; a real backend replaces it without touching UI (CLAUDE.md non-negotiable).
- **Honest copy** — "save your plan" (not "sync across devices"); the Pro upgrade is "clearly a demo, no card" (PRODUCT §12/§14).
- **Approach A — namespaced buckets + copy-on-sign-in.** Per-profile localStorage keys via `profileKey(base, id)` = `` `${base}:${id}` ``. `signIn` copies the guest bucket into a new user bucket; the guest bucket survives (supports sign-out). The **profile registry itself is global** (`planner.profiles.v1`) — it's the pointer to the active profile.
- **The metered lever = AI inputs/day** (PRODUCT §14). One `Plan it` tap = one AI input. Reviewing/editing/moving/saving/checking-off are free. `freeDailyInputs` — demo default **3** — from Edge Config with a hardcoded `3` fallback; Pro = unlimited. Resets at **local midnight** (date-keyed count). Client-side metering only (bypassable, fine while faked).
- **Conversion moments are non-blocking + dismissible** — the task action (organize / save) always completes; the card/sheet is an overlay after (PRODUCT §12).
- **Landing rule** (PRODUCT §13, extended): `AuthService.current() === null` (pre-guest) → `/welcome`; otherwise any task exists → `/today`, else `/capture`.
- **First-run gating** (PRODUCT §13): Capture shows the "Try an example" chip + phrasing-tip line only while `hasOrganizedOnce === false`; flips `true` on the first successful Organize (≥ 1 task parsed).
- **Mobile-first** — large touch targets (min 44px), one-handed use, nothing desktop-only.
- **Test pyramid + TDD** — Vitest for logic/components, Playwright for the full flow. Mock the LLM at the `TaskParser` boundary (fake mode already exists — keeps e2e deterministic with no API key).
- **KISS / YAGNI / SOLID / DRY** — add abstractions when a real need appears.
- **Reuse existing primitives** — `BottomSheet` (`src/components/ui/BottomSheet.tsx`, props `{ open, onClose, ariaLabel, children }`) for the nudge/limit sheets; `cn` (`src/lib/cn.ts`); design tokens in `globals.css` (`surface-*`, `text-*`, `fill-accent`, `on-accent`, `border*`). Mirror the `TaskStoreProvider` hydration pattern (`useSyncExternalStore` hydration flag + adjust-state-during-render) for `AuthProvider` — do NOT `setState` in an effect (the repo's `react-hooks/set-state-in-effect` lint rule forbids it).

---

## Scope — this plan covers Milestone M1 in full; M2 and M3 are outlined at the end

Three deployable milestones (design spec §Scope). **This plan details M1 task-by-task.** M2/M3 are outlined (expanded into their own full task lists when we reach them — same convention the core-flow plan used).

- **M1 — Identity foundation + first-run** (Tasks 1–9): `AuthService` + profiles + `profileKey`; `AuthProvider`/`useAuth`; profile-scoped task store; landing→Welcome; **Welcome** screen; first-run gating; guest→free **save nudge**; e2e + sweep. **Unlocks guest → free. Deploy checkpoint.**
- **M2 — Metering + Pro**: `UsageService`, limit gate at Organize, `BillingService`, **Plans** + **Settings**, fake upgrade. Unlocks free → pro.
- **M3 — Voice waitlist**: `WaitlistService` behind the mic teaser.

---

## File Structure (M1)

Created or modified by M1. Each file has one clear responsibility.

**Profile / auth seam — `src/lib`:**
- `src/lib/profile/profileKey.ts` — `profileKey(base, id)` namespacing helper.
- `src/lib/auth/types.ts` — `Tier`, `Profile`, `AuthService` interface, `Registry` shape.
- `src/lib/auth/LocalAuthService.ts` — `localStorage` `AuthService` (registry, startGuest, signIn copy-on-sign-in, signOut, mark*, setTier, legacy adoption).
- `src/lib/auth/AuthProvider.tsx` — React context bridging `AuthService` to UI (hydration-safe).
- `src/lib/auth/useAuth.ts` — hook exposing `profile` + actions.
- `src/lib/tasks/ProfileTaskStore.tsx` — client bridge: builds a profile-scoped `LocalTaskStore` and remounts `TaskStoreProvider` per profile.

**Nudge:**
- `src/lib/nudge/SaveNudgeProvider.tsx` — context + provider that renders the save nudge and exposes `notifySaved()`.
- `src/lib/nudge/useSaveNudge.ts` — hook exposing `notifySaved()`.
- `src/components/auth/SaveNudgeSheet.tsx` — the "Keep this plan?" sheet (over `BottomSheet`).
- `src/components/auth/SignInForm.tsx` — shared passwordless email/name field + submit (reused by Welcome + nudge).

**Screens / routing:**
- `src/components/screens/WelcomeScreen.tsx` — value prop + Get started + Sign in.
- `src/app/welcome/page.tsx` — the `/welcome` route.
- `src/app/page.tsx` — MODIFY: landing redirect gains the pre-guest → `/welcome` branch.
- `src/app/(app)/layout.tsx` — MODIFY: wrap in `AuthProvider` → `ProfileTaskStore` → `SaveNudgeProvider`.
- `src/components/screens/CaptureFlow.tsx` — MODIFY: gate chip/tip on `hasOrganizedOnce`; `markOrganized()` on first organize; `notifySaved()` after Review commit.
- `src/components/screens/TodayScreen.tsx`, `src/components/screens/InboxScreen.tsx` — MODIFY: `notifySaved()` after a manual new-task add.
- `src/lib/storage/LocalTaskStore.ts` — MODIFY: export the base key constant `TASKS_KEY`.
- `.env.example` — MODIFY: retire the unused `MVP_USERNAME`/`MVP_PASSWORD` (passwordless design).

---

# Milestone M1 — Identity foundation + first-run

**Deliverable at the end of M1:** a guest lands on Welcome, brain-dumps, saves, is offered "sign in to save your plan," signs in (fake, passwordless), and their tasks persist under a signed-in profile. First-run intro treatment shows only before the first organize. Deployable; unlocks the guest → free rung.

---

## Task 1: `profileKey` namespacing helper

**Files:**
- Create: `src/lib/profile/profileKey.ts`
- Test: `src/lib/profile/profileKey.test.ts`

**Interfaces:**
- Produces: `profileKey(base: string, profileId: string): string`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/profile/profileKey.test.ts
import { describe, it, expect } from "vitest";
import { profileKey } from "./profileKey";

describe("profileKey", () => {
  it("suffixes the base key with the profile id", () => {
    expect(profileKey("planner.tasks.v1", "guest")).toBe("planner.tasks.v1:guest");
  });
  it("namespaces distinct profiles to distinct keys", () => {
    expect(profileKey("planner.tasks.v1", "abc")).not.toBe(profileKey("planner.tasks.v1", "guest"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/profile/profileKey.test.ts`
Expected: FAIL — `Cannot find module './profileKey'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/profile/profileKey.ts
/** Namespace a storage base key to a profile: profileKey("planner.tasks.v1", "guest") -> "planner.tasks.v1:guest". */
export function profileKey(base: string, profileId: string): string {
  return `${base}:${profileId}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/profile/profileKey.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/profile/profileKey.ts src/lib/profile/profileKey.test.ts
git commit -m "feat(profile): profileKey namespacing helper"
```

---

## Task 2: Auth types + `LocalAuthService`

**Files:**
- Create: `src/lib/auth/types.ts`
- Create: `src/lib/auth/LocalAuthService.ts`
- Modify: `src/lib/storage/LocalTaskStore.ts` (export the base key constant)
- Test: `src/lib/auth/LocalAuthService.test.ts`

**Interfaces:**
- Consumes: `profileKey` (Task 1); `nowISO` (`src/lib/date/clock.ts`, exists).
- Produces:
  - `Tier = "guest" | "free" | "pro"`.
  - `Profile = { id: string; tier: Tier; name?: string; email?: string; hasOrganizedOnce: boolean; hasSavedOnce: boolean; createdAt: string }`.
  - `interface AuthService { current(): Profile | null; startGuest(): Profile; signIn(input: { emailOrName: string }): Profile; signOut(): void; markOrganized(): void; markSaved(): void; setTier(tier: Tier): void }`.
  - `class LocalAuthService implements AuthService` — registry key `planner.profiles.v1`; namespaces per-profile buckets (M1: only tasks) via `profileKey`; adopts legacy unsuffixed task data as the guest bucket on first touch.
  - `TASKS_KEY = "planner.tasks.v1"` exported from `LocalTaskStore.ts`.

- [ ] **Step 1: Export the task base key from `LocalTaskStore.ts`**

Change the top of `src/lib/storage/LocalTaskStore.ts`:

```ts
import type { Task } from "../task/types";
import type { TaskStore } from "./TaskStore";

/** Base localStorage key for the task list (namespaced per profile via profileKey). */
export const TASKS_KEY = "planner.tasks.v1";
const DEFAULT_KEY = TASKS_KEY;
```

(Leave the rest of the file unchanged — `DEFAULT_KEY` still defaults the constructor.)

- [ ] **Step 2: Write the failing test**

```ts
// src/lib/auth/LocalAuthService.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { LocalAuthService } from "./LocalAuthService";
import { profileKey } from "../profile/profileKey";
import { TASKS_KEY } from "../storage/LocalTaskStore";

const guestTasksKey = profileKey(TASKS_KEY, "guest");

describe("LocalAuthService", () => {
  beforeEach(() => localStorage.clear());

  it("returns null before any profile exists (pre-guest)", () => {
    expect(new LocalAuthService().current()).toBeNull();
  });

  it("startGuest creates and returns a persisted guest profile", () => {
    const auth = new LocalAuthService();
    const guest = auth.startGuest();
    expect(guest.id).toBe("guest");
    expect(guest.tier).toBe("guest");
    expect(guest.hasOrganizedOnce).toBe(false);
    expect(guest.hasSavedOnce).toBe(false);
    // Persisted: a fresh instance sees it.
    expect(new LocalAuthService().current()?.id).toBe("guest");
  });

  it("markOrganized / markSaved flip persisted flags on the active profile", () => {
    const auth = new LocalAuthService();
    auth.startGuest();
    auth.markOrganized();
    auth.markSaved();
    const p = new LocalAuthService().current();
    expect(p?.hasOrganizedOnce).toBe(true);
    expect(p?.hasSavedOnce).toBe(true);
  });

  it("signIn mints a free profile and COPIES the guest task bucket into it", () => {
    const auth = new LocalAuthService();
    auth.startGuest();
    localStorage.setItem(guestTasksKey, JSON.stringify([{ id: "t1", title: "Kept" }]));
    const user = auth.signIn({ emailOrName: "sam@example.com" });
    expect(user.tier).toBe("free");
    expect(user.email).toBe("sam@example.com");
    expect(user.id).not.toBe("guest");
    // Copied into the user's bucket…
    expect(localStorage.getItem(profileKey(TASKS_KEY, user.id))).toContain("Kept");
    // …and the guest bucket survives (sign-out returns to it).
    expect(localStorage.getItem(guestTasksKey)).toContain("Kept");
    expect(new LocalAuthService().current()?.id).toBe(user.id);
  });

  it("signIn treats a value without '@' as a name, not an email", () => {
    const auth = new LocalAuthService();
    auth.startGuest();
    const user = auth.signIn({ emailOrName: "Sam" });
    expect(user.name).toBe("Sam");
    expect(user.email).toBeUndefined();
  });

  it("signOut returns to the guest profile", () => {
    const auth = new LocalAuthService();
    auth.startGuest();
    auth.signIn({ emailOrName: "sam@example.com" });
    auth.signOut();
    expect(auth.current()?.id).toBe("guest");
  });

  it("setTier upgrades the active profile", () => {
    const auth = new LocalAuthService();
    auth.startGuest();
    auth.signIn({ emailOrName: "sam@example.com" });
    auth.setTier("pro");
    expect(auth.current()?.tier).toBe("pro");
  });

  it("adopts legacy unsuffixed task data as the guest bucket on first touch", () => {
    localStorage.setItem(TASKS_KEY, JSON.stringify([{ id: "legacy", title: "Old" }]));
    const auth = new LocalAuthService();
    const p = auth.current(); // migration runs on read
    expect(p?.id).toBe("guest");
    expect(localStorage.getItem(guestTasksKey)).toContain("Old");
  });

  it("does NOT create a profile when there is neither a registry nor legacy data", () => {
    const auth = new LocalAuthService();
    expect(auth.current()).toBeNull();
    expect(localStorage.getItem("planner.profiles.v1")).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/lib/auth/LocalAuthService.test.ts`
Expected: FAIL — `Cannot find module './LocalAuthService'`.

- [ ] **Step 4: Write the types + implementation**

```ts
// src/lib/auth/types.ts
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
```

```ts
// src/lib/auth/LocalAuthService.ts
import type { AuthService, Profile, Registry, Tier } from "./types";
import { profileKey } from "../profile/profileKey";
import { TASKS_KEY } from "../storage/LocalTaskStore";
import { nowISO } from "../date/clock";

const REGISTRY_KEY = "planner.profiles.v1";
/** Base keys namespaced per profile. M1 has only tasks; M2 adds usage. */
const PER_PROFILE_KEYS = [TASKS_KEY];

/**
 * localStorage-backed identity. Namespaces per-profile buckets via profileKey and
 * copies the guest bucket into a new user bucket on sign-in (Approach A). Tolerates
 * missing/corrupt data by treating it as pre-guest.
 */
export class LocalAuthService implements AuthService {
  private has(): boolean {
    return typeof localStorage !== "undefined";
  }

  private read(): Registry | null {
    if (!this.has()) return null;
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Registry;
      if (parsed && typeof parsed === "object" && parsed.profiles) return parsed;
      return null;
    } catch {
      return null;
    }
  }

  private write(reg: Registry): void {
    if (this.has()) localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg));
  }

  /** One-time: adopt legacy unsuffixed task data as the guest bucket. Idempotent. */
  private migrateLegacyIfNeeded(): void {
    if (!this.has() || this.read()) return; // registry already exists → nothing to adopt
    const legacy = localStorage.getItem(TASKS_KEY);
    if (!legacy) return;
    localStorage.setItem(profileKey(TASKS_KEY, "guest"), legacy);
    this.write({ activeId: "guest", profiles: { guest: this.newGuest() } });
  }

  private newGuest(): Profile {
    return { id: "guest", tier: "guest", hasOrganizedOnce: false, hasSavedOnce: false, createdAt: nowISO() };
  }

  current(): Profile | null {
    this.migrateLegacyIfNeeded();
    const reg = this.read();
    if (!reg || !reg.activeId) return null;
    return reg.profiles[reg.activeId] ?? null;
  }

  startGuest(): Profile {
    const reg = this.read() ?? { activeId: null, profiles: {} };
    const guest = reg.profiles.guest ?? this.newGuest();
    reg.profiles.guest = guest;
    reg.activeId = "guest";
    this.write(reg);
    return guest;
  }

  signIn(input: { emailOrName: string }): Profile {
    const reg = this.read() ?? { activeId: null, profiles: {} };
    const from = reg.activeId ? reg.profiles[reg.activeId] : this.startGuestInto(reg);
    const isEmail = input.emailOrName.includes("@");
    const id = crypto.randomUUID();
    const profile: Profile = {
      id,
      tier: "free",
      email: isEmail ? input.emailOrName : undefined,
      name: isEmail ? undefined : input.emailOrName,
      hasOrganizedOnce: from?.hasOrganizedOnce ?? false,
      hasSavedOnce: from?.hasSavedOnce ?? false,
      createdAt: nowISO(),
    };
    // Copy-on-sign-in: carry the guest's buckets into the new user's namespace.
    if (from && this.has()) {
      for (const base of PER_PROFILE_KEYS) {
        const val = localStorage.getItem(profileKey(base, from.id));
        if (val !== null) localStorage.setItem(profileKey(base, id), val);
      }
    }
    reg.profiles[id] = profile;
    reg.activeId = id;
    this.write(reg);
    return profile;
  }

  private startGuestInto(reg: Registry): Profile {
    const guest = this.newGuest();
    reg.profiles.guest = guest;
    reg.activeId = "guest";
    return guest;
  }

  signOut(): void {
    const reg = this.read();
    if (!reg) return;
    if (!reg.profiles.guest) reg.profiles.guest = this.newGuest();
    reg.activeId = "guest";
    this.write(reg);
  }

  markOrganized(): void {
    this.patchActive({ hasOrganizedOnce: true });
  }

  markSaved(): void {
    this.patchActive({ hasSavedOnce: true });
  }

  setTier(tier: Tier): void {
    this.patchActive({ tier });
  }

  private patchActive(patch: Partial<Profile>): void {
    const reg = this.read();
    if (!reg || !reg.activeId) return;
    const p = reg.profiles[reg.activeId];
    if (!p) return;
    reg.profiles[reg.activeId] = { ...p, ...patch };
    this.write(reg);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/lib/auth/LocalAuthService.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/types.ts src/lib/auth/LocalAuthService.ts src/lib/auth/LocalAuthService.test.ts src/lib/storage/LocalTaskStore.ts
git commit -m "feat(auth): AuthService interface + LocalAuthService (copy-on-sign-in, legacy adoption)"
```

---

## Task 3: `AuthProvider` + `useAuth`

**Files:**
- Create: `src/lib/auth/AuthProvider.tsx`
- Create: `src/lib/auth/useAuth.ts`
- Test: `src/lib/auth/AuthProvider.test.tsx`

**Interfaces:**
- Consumes: `AuthService`, `Profile`, `Tier` (Task 2); `LocalAuthService` (Task 2).
- Produces: `useAuth()` returning `{ profile: Profile | null; startGuest(): void; signIn(input: { emailOrName: string }): void; signOut(): void; markOrganized(): void; markSaved(): void; setTier(tier: Tier): void }`; `AuthProvider` props `{ service?: AuthService; children }` (defaults to `LocalAuthService`; tests inject a fake/`LocalAuthService`).

- [ ] **Step 1: Write the failing test**

```tsx
// src/lib/auth/AuthProvider.test.tsx
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./useAuth";
import { LocalAuthService } from "./LocalAuthService";

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider service={new LocalAuthService()}>{children}</AuthProvider>;
}

describe("useAuth", () => {
  it("starts pre-guest (null) then reflects startGuest", () => {
    localStorage.clear();
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.profile).toBeNull();
    act(() => result.current.startGuest());
    expect(result.current.profile?.id).toBe("guest");
  });

  it("signIn flips the profile to a free tier reactively", () => {
    localStorage.clear();
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.startGuest());
    act(() => result.current.signIn({ emailOrName: "sam@example.com" }));
    expect(result.current.profile?.tier).toBe("free");
  });

  it("markOrganized updates the profile flag reactively", () => {
    localStorage.clear();
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.startGuest());
    act(() => result.current.markOrganized());
    expect(result.current.profile?.hasOrganizedOnce).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/auth/AuthProvider.test.tsx`
Expected: FAIL — `Cannot find module './AuthProvider'`.

- [ ] **Step 3: Write the implementation**

> Mirror the `TaskStoreProvider` hydration pattern (`src/lib/tasks/TaskStoreProvider.tsx`): a `useSyncExternalStore` hydration flag + adjust-state-during-render, so the server render and the client's first render both see `null` (no hydration mismatch), then the real profile loads once hydrated. Never `setState` in an effect (lint rule `react-hooks/set-state-in-effect`).

```tsx
// src/lib/auth/AuthProvider.tsx
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
```

```ts
// src/lib/auth/useAuth.ts
"use client";

import { useContext } from "react";
import { AuthContext, type AuthContextValue } from "./AuthProvider";

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/auth/AuthProvider.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/AuthProvider.tsx src/lib/auth/useAuth.ts src/lib/auth/AuthProvider.test.tsx
git commit -m "feat(auth): AuthProvider + useAuth reactive bridge"
```

---

## Task 4: Profile-scoped task store + app-shell providers

**Files:**
- Create: `src/lib/tasks/ProfileTaskStore.tsx`
- Modify: `src/app/(app)/layout.tsx`
- Test: `src/lib/tasks/ProfileTaskStore.test.tsx`

**Interfaces:**
- Consumes: `useAuth` (Task 3); `AuthProvider` (Task 3); `TaskStoreProvider` (`src/lib/tasks/TaskStoreProvider.tsx`, exists); `LocalTaskStore`, `TASKS_KEY` (Task 2); `profileKey` (Task 1); `useTasks` (exists).
- Produces: `ProfileTaskStore` (client) — reads the active profile, builds `new LocalTaskStore(profileKey(TASKS_KEY, profile.id))`, and renders `<TaskStoreProvider store={...} key={profile.id}>` so a profile change remounts the store and reloads the (copied) bucket. Falls back to the `guest` namespace when pre-guest.

- [ ] **Step 1: Write the failing test**

```tsx
// src/lib/tasks/ProfileTaskStore.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AuthProvider } from "../auth/AuthProvider";
import { LocalAuthService } from "../auth/LocalAuthService";
import { ProfileTaskStore } from "./ProfileTaskStore";
import { useTasks } from "./useTasks";
import { useAuth } from "../auth/useAuth";

function Probe() {
  const { tasks, addTask } = useTasks();
  const { signIn } = useAuth();
  return (
    <div>
      <span data-testid="count">{tasks.length}</span>
      <button onClick={() => addTask({ title: "Kept" })}>add</button>
      <button onClick={() => signIn({ emailOrName: "sam@example.com" })}>signin</button>
    </div>
  );
}

describe("ProfileTaskStore", () => {
  it("preserves tasks across sign-in (copy-on-sign-in bucket)", async () => {
    localStorage.clear();
    const service = new LocalAuthService();
    service.startGuest();
    render(
      <AuthProvider service={service}>
        <ProfileTaskStore>
          <Probe />
        </ProfileTaskStore>
      </AuthProvider>,
    );
    await act(async () => { screen.getByText("add").click(); });
    expect(screen.getByTestId("count").textContent).toBe("1");
    await act(async () => { screen.getByText("signin").click(); });
    // Remounted under the user bucket, which was copied from guest → task survives.
    expect(screen.getByTestId("count").textContent).toBe("1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/tasks/ProfileTaskStore.test.tsx`
Expected: FAIL — `Cannot find module './ProfileTaskStore'`.

- [ ] **Step 3: Write the implementation + wire the layout**

```tsx
// src/lib/tasks/ProfileTaskStore.tsx
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
```

```tsx
// src/app/(app)/layout.tsx
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { ProfileTaskStore } from "@/lib/tasks/ProfileTaskStore";
import { SaveNudgeProvider } from "@/lib/nudge/SaveNudgeProvider";
import { TabBar } from "@/components/nav/TabBar";

/** App shell: identity → profile-scoped task store → save-nudge, then the bottom tab bar. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProfileTaskStore>
        <SaveNudgeProvider>
          <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-surface-2 text-text-primary">
            <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
            <TabBar />
          </div>
        </SaveNudgeProvider>
      </ProfileTaskStore>
    </AuthProvider>
  );
}
```

> `SaveNudgeProvider` is created in Task 8. To keep this task's tree compiling before then, Task 8 is a prerequisite of running the app, but this file references it now. **Order note:** implement Task 8 before doing a full app run / e2e; unit tests in this task don't import the layout, so they pass independently.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/tasks/ProfileTaskStore.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tasks/ProfileTaskStore.tsx "src/app/(app)/layout.tsx" src/lib/tasks/ProfileTaskStore.test.tsx
git commit -m "feat(tasks): profile-scoped task store + AuthProvider app shell"
```

---

## Task 5: Landing redirect → Welcome when pre-guest

**Files:**
- Modify: `src/app/page.tsx`
- Test: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: `LocalAuthService` (Task 2); `LocalTaskStore`, `TASKS_KEY` (Task 2); `profileKey` (Task 1).
- Produces: landing effect — `current() === null` → `/welcome`; else profile-scoped tasks exist → `/today`, else `/capture`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/page.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

import Landing from "./page";

describe("Landing redirect", () => {
  beforeEach(() => { localStorage.clear(); replace.mockClear(); });

  it("sends a pre-guest visitor to Welcome", () => {
    render(<Landing />);
    expect(replace).toHaveBeenCalledWith("/welcome");
  });

  it("sends a guest with no tasks to Capture", async () => {
    const { LocalAuthService } = await import("@/lib/auth/LocalAuthService");
    new LocalAuthService().startGuest();
    render(<Landing />);
    expect(replace).toHaveBeenCalledWith("/capture");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/page.test.tsx`
Expected: FAIL — landing still redirects to `/capture` for a pre-guest visitor (asserts `/welcome`).

- [ ] **Step 3: Write the implementation**

```tsx
// src/app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LocalAuthService } from "@/lib/auth/LocalAuthService";
import { LocalTaskStore, TASKS_KEY } from "@/lib/storage/LocalTaskStore";
import { profileKey } from "@/lib/profile/profileKey";

/**
 * Landing rule (PRODUCT §12/§13): pre-guest → Welcome; otherwise any task exists →
 * Today, else → Capture. Reads the services directly (no provider) — same pattern
 * as the task-store read this file already used.
 */
export default function Landing() {
  const router = useRouter();
  useEffect(() => {
    const profile = new LocalAuthService().current();
    if (!profile) {
      router.replace("/welcome");
      return;
    }
    const hasTasks = new LocalTaskStore(profileKey(TASKS_KEY, profile.id)).load().length > 0;
    router.replace(hasTasks ? "/today" : "/capture");
  }, [router]);
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/page.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/page.test.tsx
git commit -m "feat(shell): landing routes pre-guest visitors to Welcome"
```

---

## Task 6: `SignInForm` + Welcome screen

**Files:**
- Create: `src/components/auth/SignInForm.tsx`
- Create: `src/components/screens/WelcomeScreen.tsx`
- Create: `src/app/welcome/page.tsx`
- Test: `src/components/screens/WelcomeScreen.test.tsx`

**Interfaces:**
- Consumes: `LocalAuthService` (Task 2); `useRouter` (`next/navigation`); `cn` (exists); `DaysparkWordmark` (`src/components/brand/DaysparkWordmark.tsx`, exists).
- Produces:
  - `SignInForm` props `{ onSubmit(emailOrName: string): void; submitLabel?: string; autoFocus?: boolean }` — one text input (email or name) + submit; disabled while empty; trims input. Reused by the save nudge (Task 8).
  - `WelcomeScreen` (client) — value prop + **Get started** (`startGuest` → `/capture`) + **Sign in** (reveals `SignInForm`; `signIn` → `/capture`). Uses `new LocalAuthService()` directly (navigates away; no provider needed on this pre-app route).
  - `/welcome` route renders `WelcomeScreen`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/screens/WelcomeScreen.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { WelcomeScreen } from "./WelcomeScreen";
import { LocalAuthService } from "@/lib/auth/LocalAuthService";

describe("WelcomeScreen", () => {
  beforeEach(() => { localStorage.clear(); push.mockClear(); });

  it("Get started mints a guest and routes to Capture", async () => {
    render(<WelcomeScreen />);
    await userEvent.click(screen.getByRole("button", { name: /get started/i }));
    expect(new LocalAuthService().current()?.tier).toBe("guest");
    expect(push).toHaveBeenCalledWith("/capture");
  });

  it("Sign in reveals the form and creates a free profile", async () => {
    render(<WelcomeScreen />);
    await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    await userEvent.type(screen.getByLabelText(/email or name/i), "sam@example.com");
    await userEvent.click(screen.getByRole("button", { name: /save my plan|continue|sign in/i }));
    expect(new LocalAuthService().current()?.tier).toBe("free");
    expect(push).toHaveBeenCalledWith("/capture");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/screens/WelcomeScreen.test.tsx`
Expected: FAIL — `Cannot find module './WelcomeScreen'`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/auth/SignInForm.tsx
"use client";

import { useState } from "react";

interface Props {
  onSubmit(emailOrName: string): void;
  submitLabel?: string;
  autoFocus?: boolean;
}

/** Fake passwordless sign-in: one field (email or name), no password (PRODUCT §12). */
export function SignInForm({ onSubmit, submitLabel = "Save my plan", autoFocus = false }: Props) {
  const [value, setValue] = useState("");
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const v = value.trim();
        if (v) onSubmit(v);
      }}
    >
      <input
        aria-label="Email or name"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Email or name"
        className="min-h-11 rounded-lg border border-border bg-surface-2 px-3 text-base outline-none"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="min-h-11 rounded-full bg-fill-accent px-4 text-[15px] font-medium text-on-accent disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </form>
  );
}
```

```tsx
// src/components/screens/WelcomeScreen.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LocalAuthService } from "@/lib/auth/LocalAuthService";
import { DaysparkWordmark } from "@/components/brand/DaysparkWordmark";
import { SignInForm } from "@/components/auth/SignInForm";

/** Pre-guest entry (PRODUCT §12): value prop → Get started (guest) or Sign in (free). */
export function WelcomeScreen() {
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const auth = new LocalAuthService();

  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-6 py-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <DaysparkWordmark />
        <h1 className="text-2xl font-medium">Plan your day in one brain-dump.</h1>
        <p className="text-text-secondary">
          Get everything out of your head — tasks, errands, deadlines. Dayspark sorts it into your day.
        </p>
      </header>

      {signingIn ? (
        <SignInForm
          autoFocus
          onSubmit={(emailOrName) => {
            auth.signIn({ emailOrName });
            router.push("/capture");
          }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              auth.startGuest();
              router.push("/capture");
            }}
            className="min-h-11 rounded-full bg-fill-accent px-4 text-[15px] font-medium text-on-accent"
          >
            Get started
          </button>
          <button type="button" onClick={() => setSigningIn(true)} className="min-h-11 text-[15px] text-text-secondary">
            Sign in
          </button>
        </div>
      )}
    </section>
  );
}
```

```tsx
// src/app/welcome/page.tsx
import { WelcomeScreen } from "@/components/screens/WelcomeScreen";

export default function WelcomePage() {
  return <WelcomeScreen />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/screens/WelcomeScreen.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/SignInForm.tsx src/components/screens/WelcomeScreen.tsx src/app/welcome/page.tsx src/components/screens/WelcomeScreen.test.tsx
git commit -m "feat(welcome): Welcome screen + shared passwordless SignInForm"
```

---

## Task 7: First-run gating in Capture

**Files:**
- Modify: `src/components/screens/CaptureFlow.tsx`
- Test: `src/components/screens/CaptureFlow.test.tsx` (add cases)

**Interfaces:**
- Consumes: `useAuth` (Task 3).
- Produces: CaptureFlow shows the "Try an example" chip + phrasing-tip line only while `profile?.hasOrganizedOnce !== true`; calls `markOrganized()` on the first successful organize (parse returns ≥ 1 task).

- [ ] **Step 1: Write the failing test**

> The existing `CaptureFlow.test.tsx` renders `<CaptureFlow />` inside a `TaskStoreProvider`. It must now also be wrapped in an `AuthProvider`. Add a small wrapper helper and two cases. (Update the existing renders in this file to include `AuthProvider` — the provider defaults are test-safe.)

```tsx
// add to src/components/screens/CaptureFlow.test.tsx
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { LocalAuthService } from "@/lib/auth/LocalAuthService";

function renderCapture() {
  const service = new LocalAuthService();
  service.startGuest();
  return render(
    <AuthProvider service={service}>
      <TaskStoreProvider store={new MemoryTaskStore()}>
        <CaptureFlow />
      </TaskStoreProvider>
    </AuthProvider>,
  );
}

it("shows the 'Try an example' chip on first run", () => {
  localStorage.clear();
  renderCapture();
  expect(screen.getByRole("button", { name: /try an example/i })).toBeInTheDocument();
});

it("hides the first-run chip once the profile has organized before", () => {
  localStorage.clear();
  const service = new LocalAuthService();
  service.startGuest();
  service.markOrganized();
  render(
    <AuthProvider service={service}>
      <TaskStoreProvider store={new MemoryTaskStore()}>
        <CaptureFlow />
      </TaskStoreProvider>
    </AuthProvider>,
  );
  expect(screen.queryByRole("button", { name: /try an example/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/screens/CaptureFlow.test.tsx`
Expected: FAIL — the chip renders unconditionally, so the "hides…once organized" case fails (and unwrapped renders throw `useAuth must be used within an AuthProvider` until the existing cases are wrapped).

- [ ] **Step 3: Write the implementation**

In `src/components/screens/CaptureFlow.tsx`:

1. Add the import + hook:

```tsx
import { useAuth } from "@/lib/auth/useAuth";
```

```tsx
// inside CaptureFlow(), alongside the other hooks:
const { profile, markOrganized } = useAuth();
const firstRun = profile?.hasOrganizedOnce !== true;
```

2. Gate the chip (wrap the existing `<div className="flex justify-end">…</div>` block):

```tsx
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
```

3. Gate the tip line (wrap the existing phrasing-tip `<p>`):

```tsx
{firstRun && (
  <p className="text-[13px] text-text-secondary">
    Tip: say <em>when</em> — “today”, “tomorrow 3pm”, “gym this evening”, “report due Fri”.
  </p>
)}
```

4. Flag first-organize in `planIt()` after a successful parse:

```tsx
const { tasks, degraded } = await organize(text);
if (tasks.length > 0) markOrganized();
setDegraded(degraded);
setProposal(tasks);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/screens/CaptureFlow.test.tsx`
Expected: PASS (existing cases + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/components/screens/CaptureFlow.tsx src/components/screens/CaptureFlow.test.tsx
git commit -m "feat(capture): gate first-run chip/tip on hasOrganizedOnce"
```

---

## Task 8: Guest → Free save nudge

**Files:**
- Create: `src/components/auth/SaveNudgeSheet.tsx`
- Create: `src/lib/nudge/SaveNudgeProvider.tsx`
- Create: `src/lib/nudge/useSaveNudge.ts`
- Modify: `src/components/screens/CaptureFlow.tsx` (call `notifySaved()` after Review commit)
- Modify: `src/components/screens/TodayScreen.tsx`, `src/components/screens/InboxScreen.tsx` (call `notifySaved()` after a manual new-task add)
- Test: `src/lib/nudge/SaveNudgeProvider.test.tsx`

**Interfaces:**
- Consumes: `useAuth` (Task 3); `BottomSheet` (`src/components/ui/BottomSheet.tsx`); `SignInForm` (Task 6).
- Produces:
  - `SaveNudgeSheet` props `{ open; onClose(); onSignIn(emailOrName: string): void }` — "Keep this plan? Sign in to save it." + `SignInForm` + a "Continue as guest" (→ `onClose`).
  - `SaveNudgeProvider` (client) — renders `SaveNudgeSheet`, exposes `notifySaved()`. `notifySaved()`: if `profile?.tier === "guest"` and `!profile.hasSavedOnce` → `markSaved()` + open the sheet (once). Sign-in from the sheet runs `useAuth().signIn`.
  - `useSaveNudge()` → `{ notifySaved(): void }`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/lib/nudge/SaveNudgeProvider.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AuthProvider } from "../auth/AuthProvider";
import { LocalAuthService } from "../auth/LocalAuthService";
import { SaveNudgeProvider } from "./SaveNudgeProvider";
import { useSaveNudge } from "./useSaveNudge";

function Trigger() {
  const { notifySaved } = useSaveNudge();
  return <button onClick={() => notifySaved()}>save</button>;
}

function setup(service: LocalAuthService) {
  return render(
    <AuthProvider service={service}>
      <SaveNudgeProvider>
        <Trigger />
      </SaveNudgeProvider>
    </AuthProvider>,
  );
}

describe("SaveNudgeProvider", () => {
  beforeEach(() => localStorage.clear());

  it("shows the nudge on a guest's first save, once", async () => {
    const service = new LocalAuthService();
    service.startGuest();
    setup(service);
    await act(async () => { screen.getByText("save").click(); });
    expect(screen.getByText(/keep this plan/i)).toBeInTheDocument();
    // Dismiss + save again → does not reappear (hasSavedOnce guards it).
    await act(async () => { screen.getByRole("button", { name: /continue as guest/i }).click(); });
    await act(async () => { screen.getByText("save").click(); });
    expect(screen.queryByText(/keep this plan/i)).not.toBeInTheDocument();
  });

  it("never shows the nudge for a signed-in (free) user", async () => {
    const service = new LocalAuthService();
    service.startGuest();
    service.signIn({ emailOrName: "sam@example.com" });
    setup(service);
    await act(async () => { screen.getByText("save").click(); });
    expect(screen.queryByText(/keep this plan/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/nudge/SaveNudgeProvider.test.tsx`
Expected: FAIL — `Cannot find module './SaveNudgeProvider'`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/auth/SaveNudgeSheet.tsx
"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { SignInForm } from "./SignInForm";

interface Props {
  open: boolean;
  onClose(): void;
  onSignIn(emailOrName: string): void;
}

/** Guest→Free conversion moment (PRODUCT §12): non-blocking, dismissible. */
export function SaveNudgeSheet({ open, onClose, onSignIn }: Props) {
  return (
    <BottomSheet open={open} onClose={onClose} ariaLabel="Save your plan">
      <h2 className="text-lg font-medium">Keep this plan?</h2>
      <p className="mt-1 text-text-secondary">Sign in to save it — so you don’t lose it.</p>
      <div className="mt-4">
        <SignInForm autoFocus onSubmit={onSignIn} />
      </div>
      <button type="button" onClick={onClose} className="mt-3 min-h-11 w-full text-[15px] text-text-secondary">
        Continue as guest
      </button>
    </BottomSheet>
  );
}
```

```tsx
// src/lib/nudge/SaveNudgeProvider.tsx
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
```

```ts
// src/lib/nudge/useSaveNudge.ts
"use client";

import { useContext } from "react";
import { SaveNudgeContext, type SaveNudgeValue } from "./SaveNudgeProvider";

export function useSaveNudge(): SaveNudgeValue {
  const ctx = useContext(SaveNudgeContext);
  if (!ctx) throw new Error("useSaveNudge must be used within a SaveNudgeProvider");
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/nudge/SaveNudgeProvider.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire `notifySaved()` into the three save paths**

In `src/components/screens/CaptureFlow.tsx` — import and call after the Review commit:

```tsx
import { useSaveNudge } from "@/lib/nudge/useSaveNudge";
```

```tsx
// alongside the other hooks:
const { notifySaved } = useSaveNudge();
```

```tsx
// in the ReviewScreen onCommit handler:
onCommit={(tasks) => {
  addTasks(tasks);
  notifySaved();
  router.push("/today");
}}
```

In `src/components/screens/TodayScreen.tsx` and `src/components/screens/InboxScreen.tsx` — add the import + hook, and call `notifySaved()` only on a manual **new** add:

```tsx
import { useSaveNudge } from "@/lib/nudge/useSaveNudge";
```

```tsx
// alongside the other hooks:
const { notifySaved } = useSaveNudge();
```

```tsx
// in the editor onSave handler, the new-task branch:
onSave={(draft: TaskDraft) => {
  if (editing === "new") { addTask(draft); notifySaved(); }
  else updateTask(editing.id, draft);
  setEditing(null);
}}
```

> Note: `router.push("/today")` unmounts CaptureFlow but `SaveNudgeProvider` lives in the app-shell layout (Task 4), which stays mounted across `/capture`→`/today`, so the sheet survives the navigation.

- [ ] **Step 6: Run the affected suites + typecheck**

Run: `npm test -- src/components/screens src/lib/nudge && npm run typecheck`
Expected: PASS; no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/auth/SaveNudgeSheet.tsx src/lib/nudge/SaveNudgeProvider.tsx src/lib/nudge/useSaveNudge.ts src/components/screens/CaptureFlow.tsx src/components/screens/TodayScreen.tsx src/components/screens/InboxScreen.tsx src/lib/nudge/SaveNudgeProvider.test.tsx
git commit -m "feat(nudge): guest→free 'save your plan' nudge on first save"
```

---

## Task 9: e2e (guest → save → sign in → persist) + M1 sweep + env cleanup

**Files:**
- Create: `e2e/access-ladder.spec.ts`
- Modify: `.env.example` (retire `MVP_USERNAME`/`MVP_PASSWORD`)

**Interfaces:**
- Consumes: the whole M1 flow. Runs in fake AI mode (deterministic, no API key) — the existing `e2e/core-flow.spec.ts` establishes the pattern.

- [ ] **Step 1: Write the e2e test**

```ts
// e2e/access-ladder.spec.ts
import { test, expect } from "@playwright/test";

test("guest lands on Welcome, saves a plan, is nudged, signs in, and keeps the plan", async ({ page }) => {
  await page.goto("/");
  // Pre-guest → Welcome.
  await expect(page.getByRole("button", { name: /get started/i })).toBeVisible();
  await page.getByRole("button", { name: /get started/i }).click();

  // Capture → brain dump → Plan it (fake mode is deterministic).
  await page.getByRole("button", { name: /try an example/i }).click();
  await page.getByRole("button", { name: /plan it/i }).click();

  // Review → commit.
  await page.getByRole("button", { name: /add \d+ tasks?/i }).click();

  // Guest→free nudge appears; sign in to save.
  await expect(page.getByText(/keep this plan/i)).toBeVisible();
  await page.getByLabelText(/email or name/i).fill("sam@example.com");
  await page.getByRole("button", { name: /save my plan/i }).click();

  // Tasks persisted under the signed-in profile (still on Today with tasks).
  await expect(page).toHaveURL(/\/today/);
  await expect(page.getByText(/pitch deck/i)).toBeVisible();
});
```

- [ ] **Step 2: Run the e2e to verify it passes**

Run: `npm run test:e2e -- access-ladder`
Expected: PASS (1 test). If the local run is blocked by a concurrent dev server holding the `.next` lock, rely on CI (matches the Phase-1 precedent) — note it in the PR.

- [ ] **Step 3: Retire the unused MVP auth env vars**

Edit `.env.example` — remove the `MVP_USERNAME` and `MVP_PASSWORD` lines and add a one-line note that auth is faked + passwordless (PRODUCT §12). (The Vercel-side vars can be deleted at deploy time — note it in the PR, do not block on it.)

- [ ] **Step 4: Full M1 sweep**

Run: `npm run lint && npm run typecheck && npm test && npm run test:e2e`
Expected: all green. Record the unit count.

- [ ] **Step 5: Commit**

```bash
git add e2e/access-ladder.spec.ts .env.example
git commit -m "test(e2e): guest→free access-ladder flow; retire unused MVP auth env vars"
```

---

# Milestone M2 — Metering + Pro (outline — expand into full tasks when reached)

Builds on M1's `AuthService`/profiles. Unlocks free → pro.

- **`UsageService`** (`src/lib/usage/UsageService.ts` interface + `LocalUsageService`) — per-profile, keyed by local date via `profileKey` + `todayISO()`. `count(today)`, `increment(today)`, `remaining(today, limit)`. **Local-midnight reset** is implicit (a new date string → count 0). Add `USAGE_KEY` to `PER_PROFILE_KEYS` in `LocalAuthService` so copy-on-sign-in carries usage forward. TDD: increment, remaining, reset-across-dates.
- **Surface the limit** — extend `OrganizeResult` + `/api/organize` response with `freeDailyInputs: number` (the boundary already resolves it from Edge Config with the hardcoded `3` fallback — echo it back). Client caches it; assumes `3` before the first call. Update `organizeClient.ts` + `route.ts` + their tests.
- **Free→Pro gate** — in `CaptureFlow.planIt()`, before `organize()`: allow if `isPro()` or `remaining(today, freeDailyInputs) > 0`; else open the **limit-reached sheet** (over `BottomSheet`) → link to `/plans`. On success, `usage.increment(today)`. Pro skips the check.
- **`BillingService`** (`src/lib/billing/BillingService.ts` + `LocalBillingService`) — `isPro()` (reads `AuthService` tier), `upgrade()` → `setTier("pro")`, `downgrade()` → `setTier("free")`. Thin wrapper; TDD.
- **Plans screen** (`/plans` + `PlansScreen`) — Free vs Pro table (Free = full core + `N`/day; Pro = unlimited + voice/Week/notifications "coming soon"), current-plan marker, one-tap fake "Upgrade to Pro", demo downgrade. Reachable from Settings, the limit sheet, any Pro-locked tap, and Welcome's "What's included" (add that link to `WelcomeScreen` now).
- **Settings screen** (`/settings` + `SettingsScreen`) — account line by tier, plan status → Plans, a guidance/Tips link, gear entry point in the app header. **Show/hide-completed stays per screen — not centralized here** (locked decision).
- **e2e**: free user hits the limit (set `freeDailyInputs` low / exhaust) → limit sheet → Plans → fake upgrade → unlimited.

# Milestone M3 — Voice waitlist (outline — expand when reached)

- **`WaitlistService`** (`src/lib/waitlist/WaitlistService.ts` + `LocalWaitlistService`) — `join({ email, feature: "voice" })` stores `{ email, feature, createdAt, userId? }`; `hasJoined("voice")`. Global (not per-profile) or per-profile keyed by userId — decide at expansion. TDD.
- **Wire the mic teaser** — the existing `VoiceComingSoonSheet` gains a "Notify me" path: signed-in → email known (one-tap join); guest → email field. Stateful mic: not-joined → email sheet; already-joined → "You're on the list." Waitlist ≠ registration (never creates an account). Log every mic tap via the usage layer (demand signal).
- **e2e**: tap mic → join waitlist → reopen → "You're on the list."

---

## Self-Review (completed while writing — notes for the implementer)

- **Spec coverage.** M1 maps to spec §Scope M1: `AuthService`/profiles/`profileKey` (Tasks 1–2), `AuthProvider`/`useAuth` (Task 3), profile-scoped store + copy-on-sign-in persistence (Tasks 2, 4), landing→Welcome (Task 5), Welcome + passwordless sign-in (Task 6), first-run gating (Task 7), guest→free save nudge (Task 8), e2e + env cleanup (Task 9). M2/M3 spec sections are outlined for their own plans (metering/Pro/Plans/Settings; voice waitlist), matching the design's "one spec, three deployable milestones."
- **Type consistency.** `Profile`/`Tier`/`AuthService` defined once (Task 2), consumed verbatim by `AuthProvider` (Task 3), `ProfileTaskStore`, landing, Welcome, and the nudge. `profileKey(base, id)` and `TASKS_KEY` are the single source for bucket names (Tasks 1–2) used by `LocalAuthService`, `ProfileTaskStore`, and landing. `useAuth()` action names (`startGuest`, `signIn`, `signOut`, `markOrganized`, `markSaved`, `setTier`) are used exactly as defined. `notifySaved()` is the one nudge entry point, called at all three save sites.
- **Decisions honored.** Approach A (namespaced + copy-on-sign-in); limit surfaced via `/api/organize` response (M2); `hasOrganizedOnce`/`hasSavedOnce` on the Profile; client-side metering (M2); show/hide-completed stays per screen (M2 note).
- **Ordering caveat flagged.** Task 4 references `SaveNudgeProvider` (Task 8) in the layout; unit tests pass independently, but a full app run / e2e needs Task 8 first (noted in Task 4). Implement in order.
- **Hydration.** `AuthProvider` mirrors `TaskStoreProvider`'s hydration-safe pattern (no effect setState) to satisfy the `react-hooks/set-state-in-effect` lint rule and avoid SSR mismatch.
- **Determinism.** e2e runs in fake AI mode (no key), like `core-flow.spec.ts`.
