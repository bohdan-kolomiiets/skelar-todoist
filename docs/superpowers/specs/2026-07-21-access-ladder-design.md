# Access Ladder & Conversion Funnel — Design

> Status: **approved (brainstorm)**, ready for plan. 2026-07-21.
> Implements PRODUCT §12 (3-rung ladder), §13 (onboarding first-run), §14 (plans &
> freemium), §16 (voice fake-door) + the Milestone C **first-run gating** item. This is
> the work the core-flow plan named **"Plan 2"** plus the one Milestone C onboarding piece.

## Goal

Turn the working single-user planner into a demo of the **guest → free (signed-in) → pro**
conversion funnel. The user should be able to walk the whole ladder — land as an anonymous
guest, get nudged to "save your plan" by signing in, hit a daily AI limit, and fake-upgrade
to Pro — with every rung's mechanics behind a **swappable `localStorage`-backed service**
so a real backend/DB can replace it without touching UI (CLAUDE.md non-negotiable).

Everything is **faked**: no real accounts, no passwords, no payments, no server-side
enforcement. Honest copy throughout ("save your plan", not "sync across devices").

## Non-goals

- Real auth, real billing, real cross-device sync (interfaces make these swappable later).
- Server-side usage enforcement (client-side `localStorage` metering is bypassable — fine
  while faked; §14 says it moves server-side with the real backend).
- Voice as a working feature (ships only as the fake-door teaser; §16).
- Notifications / Week tab / auto-rollover (out of MVP; §16 — surface only as Pro
  "coming soon" labels on the Plans screen).

## Scope — one spec, three deployable milestones

| Milestone | Delivers | Rung it unlocks |
|---|---|---|
| **M1 — Identity foundation + first-run** | `AuthService` + profiles + `profileKey` namespacing + `AuthProvider`/`useAuth`; first-run gating (`hasOrganizedOnce`); **Welcome** screen; guest→free **"save your plan"** nudge on first Save | guest → free |
| **M2 — Metering + Pro** | `UsageService` (daily AI-input count, midnight reset vs Edge Config `freeDailyInputs`); limit-reached gate at Organize; `BillingService`/entitlements; **Plans** + **Settings** screens; fake upgrade | free → pro |
| **M3 — Voice waitlist** | `WaitlistService` capture behind the existing mic teaser sheet; stateful mic (joined / not-joined) | (demand signal) |

Each milestone is independently deployable. Existing behavior (167 unit + e2e) stays green;
all changes are additive.

---

## Architecture — the swappable service seams (`src/lib`)

Four small interfaces, each `localStorage`-backed now, each replaceable without touching UI.
They follow the existing `TaskStore` / `TaskStoreProvider` pattern already in the repo.

### The one shared primitive: `profileKey`

```ts
// src/lib/profile/profileKey.ts
/** Namespace a storage base key to a profile: "planner.tasks.v1" + "guest" -> "planner.tasks.v1:guest". */
export function profileKey(base: string, profileId: string): string {
  return `${base}:${profileId}`;
}
```

Every per-profile localStorage seam builds its key through this. This is the entire cost of
the "namespaced buckets" decision (Approach A, below).

### `AuthService` — identity + profiles

```ts
export type Tier = "guest" | "free" | "pro";

export interface Profile {
  id: string;               // "guest" for the anonymous profile; uuid for signed-in
  tier: Tier;
  name?: string;
  email?: string;
  hasOrganizedOnce: boolean; // first-run gating source of truth (PRODUCT §13)
  hasSavedOnce: boolean;     // guest→free nudge fires once (PRODUCT §12)
  createdAt: string;         // ISO
}

export interface AuthService {
  current(): Profile | null;                 // null = pre-guest (show Welcome)
  startGuest(): Profile;                      // "Get started" — mint/return the guest profile
  signIn(input: { emailOrName: string }): Profile; // mint a free profile, COPY guest bucket into it
  signOut(): void;                            // back to the guest profile
  markOrganized(): void;                      // set hasOrganizedOnce = true, persist
  markSaved(): void;                          // set hasSavedOnce = true, persist
  setTier(tier: Tier): void;                  // BillingService delegates upgrade/downgrade here
}
```

- **Profile registry** persists under a fixed key (`planner.profiles.v1`) holding the active
  profile id + the profile records. Only *task/usage/etc. data* is namespaced per profile;
  the registry itself is global (it's the pointer).
- **`signIn` = copy-on-sign-in.** Mint a new `free` profile with a uuid, then copy the guest
  profile's namespaced buckets (`planner.tasks.v1:guest` → `planner.tasks.v1:<uuid>`, and the
  same for any other per-profile seam) so the just-made plan carries over. Guest bucket is left
  intact (survives sign-out). This is the literal "move data from the guest bucket to a user
  bucket" the spec describes (§12 honesty note).
- **A React `AuthProvider` + `useAuth()`** bridge it to UI (same shape as `TaskStoreProvider`
  / `useTasks`), SSR-safe hydration, functional-update persistence.
- `hasOrganizedOnce` / `hasSavedOnce` live **on the Profile**, so first-run gating and identity
  share one source of truth.

### `UsageService` — the metered lever (M2)

```ts
export interface UsageService {
  count(today: string): number;                 // AI inputs used on local date `today`
  increment(today: string): void;               // one Organize tap = +1
  remaining(today: string, limit: number): number;
}
```

- Per-profile; keyed by **local date string** (`todayISO()`), so it **resets automatically at
  local midnight** — a new date has count 0 (no timer needed). Stores `{ date, count }`.
- `limit` is passed in (comes from Edge Config `freeDailyInputs`, resolved at the boundary —
  see data flow). Pro is unlimited (the gate skips the check).
- Bypassable by design (localStorage) — acceptable while faked (§14).

### `BillingService` / entitlements (M2)

```ts
export interface BillingService {
  isPro(): boolean;
  upgrade(): void;    // fake, instant: AuthService.setTier("pro")
  downgrade(): void;  // for demo reset: back to "free"
}
```

Thin wrapper over `AuthService.setTier`. No card, no payment — the Plans button is clearly a
demo.

### `WaitlistService` — voice fake-door (M3)

```ts
export interface WaitlistService {
  join(lead: { email: string; feature: "voice" }): void; // stored { email, feature, createdAt, userId? }
  hasJoined(feature: "voice"): boolean;
}
```

Per §16: waitlist ≠ registration (never creates an account). Signed-in → email known (one tap);
guest → email field. Mic is stateful: not-joined → email sheet; joined → "You're on the list."

---

## Data flow — the three conversion moments

Each is **non-blocking and dismissible**; the underlying task action always completes first.

### 1. First-run gating (`hasOrganizedOnce`) — M1

- Capture reads `useAuth().current.hasOrganizedOnce`.
  - `false` → **intro treatment**: the "Try an example" chip (top-right of the field) + the
    phrasing-tip line. *(Both already built — this just gates them on the flag.)*
  - `true` → **steady-state** composer (no chip, no tip line).
- On the **first successful Organize** (parse returns ≥ 1 task), call `markOrganized()`.
- **Landing rule** (extends PRODUCT §13): `AuthService.current() === null` → `/welcome`;
  otherwise the existing rule (any task exists → `/today`, else `/capture`).

### 2. Guest → Free, on first Save — M1

- The commit paths — `addTasks` from Review **and** manual add from Today/Inbox — check after
  committing: `current.tier === "guest"` **and** `!current.hasSavedOnce`.
- If so: `markSaved()` then show a soft, dismissible card **"Keep this plan? Sign in to save
  it."** with **"Continue as guest."** The **save already happened** — the card never blocks
  the task.
- Sign-in from the card runs `AuthService.signIn(...)`; copy-on-sign-in preserves the tasks
  just saved.
- Fires once per guest profile (guarded by `hasSavedOnce`).

### 3. Free → Pro, on the metered lever — M2

- **One `Organize` tap = one AI input** (§14). Reviewing/editing/moving/saving are free.
- **Client pre-check before** calling `/api/organize`: allow if `isPro()` **or**
  `usage.remaining(today, freeDailyInputs) > 0`.
- If a free user is out → the **limit-reached sheet** (*"You've used today's N AI inputs."*)
  → **Plans**. The parse does not run.
- On a **successful** organize, `usage.increment(today)`.
- Resets at local midnight (date-keyed count).

### Surfacing the daily limit to the client

`/api/organize` **returns the limit in its response** alongside the existing fields:

```ts
// OrganizeResult (extended)
{ tasks: ParsedTask[]; degraded: boolean; freeDailyInputs: number }
```

The boundary already resolves `freeDailyInputs` from Edge Config with a hardcoded `3`
fallback (used by the later freemium logic); it now echoes that number back. The client uses
the returned value to render "N remaining" and caches it; **before the first call it assumes
the `3` fallback**. (Chosen over a separate `GET /api/limits` — less code, no extra round trip.)

> Note: the client pre-check is the faked gate; `/api/organize` does **not** reject on limit
> in the MVP (server-side enforcement is a real-backend concern, §14). The route only *reports*
> the number.

---

## New screens & routing

Mobile-first, one-handed. The existing `(app)` route group keeps Capture/Today/Inbox + the
tab bar; the new surfaces sit **outside** the tab bar.

### Welcome — `/welcome` (M1)

Pre-guest only (shown when `current() === null`). Value prop + **Get started**
(`startGuest()` → `/capture`) + **Sign in** (fake passwordless: email *or* name, no password →
`signIn` → `/capture`) + a **"What's included"** link → `/plans`. Once any profile exists, the
landing redirect skips Welcome.

### Plans — `/plans` (M2)

Free vs Pro comparison — Free = full core + `N` AI inputs/day; Pro = unlimited AI + voice /
Week / notifications tagged **coming soon**. Current-plan marker. One-tap **fake "Upgrade to
Pro"** (clearly a demo, no card → `BillingService.upgrade()`; a **downgrade** affordance for
demo reset). **Reachable from:** Settings, the limit-reached sheet, any Pro-locked tap, and
Welcome's "What's included."

### Settings — `/settings` (M2)

Account line by tier — guest → "Sign in to save"; free → name/email + "Upgrade"; pro → "Pro".
Plan status → Plans. The **show/hide completed** preference (§11). A guidance / Tips link. Small
entry point (gear) from the app header.

### Routing summary

- Landing (`/`) redirect gains the **pre-guest → `/welcome`** branch (else existing rule).
- `/welcome`, `/plans`, `/settings` are new routes outside the tab-bar group.
- `AuthProvider` wraps the app shell (alongside `TaskStoreProvider`) so `useAuth` is available
  everywhere, including the pre-guest Welcome.

---

## Error handling & edge cases

- **Existing pre-profile data** — tasks created before M1 live under the **non-namespaced**
  `planner.tasks.v1` key. On first M1 load, if a legacy unsuffixed bucket exists and no profile
  registry does, **adopt it as the guest bucket** (`planner.tasks.v1` → `planner.tasks.v1:guest`)
  and mint the guest profile, so nothing is orphaned. One-time, idempotent.
- **SSR / no localStorage** — providers hydrate SSR-safe (default to `null` profile on the
  server, resolve on mount), mirroring `TaskStoreProvider`. No hydration mismatch.
- **Corrupt/missing registry JSON** — tolerated (return `null` / empty like `LocalTaskStore`),
  so a bad blob shows Welcome rather than crashing.
- **Sign-in with an existing email** — faked MVP: treat as a fresh `free` profile (no real
  dedupe; §12 honesty note — dedupe is a real-backend concern). Copy-on-sign-in still runs.
- **Limit sheet vs Pro** — Pro always skips the pre-check; downgrading mid-day restores the
  count-based gate immediately (date-keyed count is unaffected).
- **Nudge idempotency** — `hasSavedOnce` / `hasOrganizedOnce` guard against re-firing; both
  persist on the profile.
- **Voice already-joined** — `hasJoined("voice")` flips the mic sheet to the confirmation
  state (§16).

## Testing (pyramid + TDD)

- **Unit** — `profileKey`; `AuthService` (startGuest, signIn copy-on-sign-in migration keeps
  guest bucket, signOut, markOrganized/markSaved, setTier); `UsageService` (increment,
  remaining, **local-midnight reset** via date-keyed count); `BillingService` (upgrade →
  isPro, downgrade); `WaitlistService` (join, hasJoined).
- **Component (RTL)** — first-run chip/tip gated on `hasOrganizedOnce`; save nudge fires once
  for a guest and not for a signed-in user; limit-reached sheet at zero remaining and skipped
  for Pro; Welcome / Plans / Settings render + primary actions.
- **e2e (Playwright, fake AI mode)** — one flow extending the graded scenario: land → Welcome →
  Get started → brain-dump → Plan it → save → **guest→free nudge** → Sign in → tasks persist
  (copy-on-sign-in). Deterministic (fake mode, no API key).
- Existing **167 unit + e2e** remain green — all changes additive (new files, gated flags,
  additive `/api/organize` response field).

## Decisions locked in this brainstorm

1. **Approach A — namespaced buckets + copy-on-sign-in** (over B, single-bucket relabel). The
   only user-visible difference is at **sign-out** and **account-switch**: A shows a separate
   guest scratch list vs. the account's saved plan; B shares one list (accounts cosmetic). A
   makes the "save your plan" nudge honest and the funnel demo convincing, for the cost of one
   `profileKey` helper + a one-line copy on sign-in. Matches the spec + swappable-seam mandate.
2. **Daily limit surfaced via the `/api/organize` response** (`freeDailyInputs` field), not a
   separate endpoint. Client assumes the `3` fallback before its first call.
3. **`hasOrganizedOnce` + `hasSavedOnce` live on the Profile** (one identity source of truth).
4. **Client-side usage metering only** (faked, bypassable) — server enforcement deferred to a
   real backend per §14.
5. **One spec, three deployable milestones** (M1 identity+first-run, M2 metering+Pro, M3 voice
   waitlist), built in order.

## Open / deferred (not in this spec)

- Server-side usage enforcement; real auth/billing/sync (swappable seams make these drop-in).
- The `MVP_USERNAME` / `MVP_PASSWORD` Vercel env vars (set in an earlier session) are unused by
  this passwordless design — **retire them** as a cleanup during M1 (noted in core-flow plan).
- Milestone C's other items (needs-a-date, quick-add AI, the 3 robustness fixes) are **not**
  in this spec — they remain queued separately.
