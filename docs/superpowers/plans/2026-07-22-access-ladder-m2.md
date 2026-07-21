# Access Ladder — Milestone M2 (Metering + Pro) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unlock the **free → pro** rung — meter one AI input per `Plan it` (daily limit, local-midnight reset), gate the metered lever with a limit-reached sheet, and let a user fake-upgrade to Pro (unlimited) from a **Plans** screen, reachable from **Settings** and the limit sheet.

**Architecture:** Two new swappable `localStorage` seams — `UsageService` (per-profile, date-keyed daily count) and `BillingService`/entitlements (tier read/write over `AuthService`) — following the M1 pattern. The `/api/organize` boundary echoes the runtime `freeDailyInputs` (Edge Config → env → fallback 3) so the client meters accurately. Plans/Settings are new screens in a new `(account)` route group that provides `AuthProvider` without the tab bar. Everything faked/client-side, consistent with M1.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Vitest + RTL · Playwright · `@vercel/edge-config`.

**Design spec:** [docs/superpowers/specs/2026-07-21-access-ladder-design.md](../specs/2026-07-21-access-ladder-design.md) (§Scope M2, data flow moment 3, screens). M2 was approved as part of that 3-milestone spec.

## Global Constraints

_Every task's requirements implicitly include this section. Values copied verbatim from the spec / PRODUCT §14._

- **The metered lever = AI inputs/day.** One `Plan it` tap = one AI input (however many tasks come back). Reviewing/editing/moving/saving/checking-off are **free**. Re-running the same text counts again (PRODUCT §14).
- **`freeDailyInputs`** — demo default **3** — resolved at runtime: **Edge Config `freeDailyInputs` → env `FREE_DAILY_INPUTS` → hardcoded fallback `3`** (mirror `resolveAiMode` in `src/lib/ai/mode.ts`). Pro = **unlimited**. **Tasks are never capped** on any tier.
- **Reset at local midnight**, implemented as a date-keyed count (a new `todayISO()` string → count 0). No timers.
- **Metering applies to all non-Pro users** (guest + free); **Pro skips the gate entirely**. Copy-on-sign-in carries usage forward (signing in must not reset the day's count) — add `USAGE_KEY` to `PER_PROFILE_KEYS` in `LocalAuthService`.
- **Client-side metering only** (bypassable — fine while faked; §14). `/api/organize` only **reports** `freeDailyInputs`; it does **not** reject on limit (server enforcement is a real-backend concern).
- **Conversion moment (free→pro) is non-blocking + dismissible.** The limit gate is a **pre-check before** calling `/api/organize`: if blocked, the parse does not run and the limit-reached sheet opens → **Plans**. No task/data is ever lost.
- **Fake upgrade** — one tap, **no card, clearly a demo** (`BillingService.upgrade()` → tier `pro`); a **downgrade** affordance exists for demo reset.
- **Everything faked + swappable** behind small `src/lib` interfaces; a real backend replaces each without touching UI (CLAUDE.md non-negotiable). Honest copy.
- **Plans/Settings live outside the tab bar** (PRODUCT §15) — a new `(account)` route group with its own `AuthProvider` (no `TabBar`, no task store). **Show/hide-completed stays a per-screen toggle — NOT centralized into Settings** (locked M1 decision).
- **Mobile-first** — ≥44px touch targets (`min-h-11`). **Secrets stay server-side.** TDD; KISS/YAGNI/DRY. Reuse `BottomSheet` (`src/components/ui/BottomSheet.tsx`, props `{ open, onClose, ariaLabel, children }`), `useAuth` (`src/lib/auth/useAuth.ts`), design tokens.

### M2-specific decisions (flagged for confirmation at the review gate)
1. **Meter non-Pro (guest + free), not just free.** An unmetered guest = unlimited AI by never signing in, which defeats the freemium demo. The limit sheet always points to **Plans** (upgrade to Pro). _If you'd rather meter only signed-in Free users, say so and Task 5's gate condition changes to `tier === "free"`._
2. **`(account)` route group** for Plans/Settings (own `AuthProvider`, no tab bar) — keeps them off the tab bar per §15 while still reactive to upgrade. _Alternative: nest under `(app)` and accept the tab bar showing._
3. **A small "N left today" indicator** near Plan it for non-Pro users (reads `usage.remaining`). Makes the meter visible. _Drop it if you'd rather keep Capture uncluttered._

---

## File Structure (M2)

**Domain / seams — `src/lib`:**
- `src/lib/ai/limits.ts` — `resolveFreeDailyInputs()` + `FREE_DAILY_INPUTS_FALLBACK`.
- `src/lib/usage/UsageService.ts` — `UsageService` interface.
- `src/lib/usage/LocalUsageService.ts` — `localStorage` impl (date-keyed) + exported `USAGE_KEY`.
- `src/lib/billing/BillingService.ts` — `BillingService` interface.
- `src/lib/billing/LocalBillingService.ts` — impl over `AuthService`.
- `src/lib/auth/LocalAuthService.ts` — MODIFY: add `USAGE_KEY` to `PER_PROFILE_KEYS`.
- `src/lib/auth/AuthProvider.tsx` — MODIFY: expose `isPro`, `upgrade()`, `downgrade()` (delegate to `LocalBillingService`).
- `src/lib/ai/organizeClient.ts` — MODIFY: `OrganizeResult` gains `freeDailyInputs: number`.

**API:**
- `src/app/api/organize/route.ts` — MODIFY: include `freeDailyInputs` in success + degraded responses.

**UI — `src/components`, `src/app`:**
- `src/components/billing/LimitReachedSheet.tsx` — limit sheet (over `BottomSheet`).
- `src/components/screens/CaptureFlow.tsx` — MODIFY: pre-check gate + `increment` + "N left" indicator.
- `src/app/(account)/layout.tsx` — `AuthProvider` + back-header, no tab bar.
- `src/app/(account)/plans/page.tsx` + `src/components/screens/PlansScreen.tsx`.
- `src/app/(account)/settings/page.tsx` + `src/components/screens/SettingsScreen.tsx`.
- `src/components/nav/SettingsGear.tsx` — a gear `Link` to `/settings`, added to Today/Inbox/Capture headers.
- `src/components/screens/WelcomeScreen.tsx` — MODIFY: add the "What's included" link → `/plans`.
- `playwright.config.ts` — MODIFY: set `FREE_DAILY_INPUTS: "1"` in the hermetic webServer env so e2e can exhaust the limit in one tap.
- `e2e/access-ladder-m2.spec.ts` — free hits limit → sheet → Plans → upgrade → unlimited.

---

# Milestone M2 — Metering + Pro

**Deliverable:** a non-Pro user sees "N left today", hits the daily limit → a dismissible sheet → Plans → one-tap fake upgrade → Pro (unlimited). Reachable from a Settings gear. Deployable; unlocks free → pro.

---

## Task 1: `resolveFreeDailyInputs()` runtime limit resolver

**Files:**
- Create: `src/lib/ai/limits.ts`
- Test: `src/lib/ai/limits.test.ts`

**Interfaces:**
- Produces: `FREE_DAILY_INPUTS_FALLBACK = 3`; `resolveFreeDailyInputs(): Promise<number>` — Edge Config `freeDailyInputs` → env `FREE_DAILY_INPUTS` → fallback. Mirrors `resolveAiMode`/`resolveAiModel` in `src/lib/ai/mode.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/ai/limits.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@vercel/edge-config", () => ({ get: vi.fn(async () => undefined) }));

import { resolveFreeDailyInputs, FREE_DAILY_INPUTS_FALLBACK } from "./limits";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("resolveFreeDailyInputs", () => {
  it("falls back to 3 when Edge Config and env are unset", async () => {
    expect(FREE_DAILY_INPUTS_FALLBACK).toBe(3);
    expect(await resolveFreeDailyInputs()).toBe(3);
  });

  it("reads a positive integer from env FREE_DAILY_INPUTS when Edge Config is unset", async () => {
    vi.stubEnv("FREE_DAILY_INPUTS", "5");
    expect(await resolveFreeDailyInputs()).toBe(5);
  });

  it("ignores a non-numeric / non-positive env value and falls back", async () => {
    vi.stubEnv("FREE_DAILY_INPUTS", "abc");
    expect(await resolveFreeDailyInputs()).toBe(3);
    vi.stubEnv("FREE_DAILY_INPUTS", "0");
    expect(await resolveFreeDailyInputs()).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/ai/limits.test.ts`
Expected: FAIL — `Cannot find module './limits'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/ai/limits.ts
import { get } from "@vercel/edge-config";

/** Hardcoded fallback when nothing is configured (PRODUCT §14 demo default). */
export const FREE_DAILY_INPUTS_FALLBACK = 3;

function asPositiveInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Free-tier daily AI-input allowance: Edge Config `freeDailyInputs` → env
 * `FREE_DAILY_INPUTS` → fallback 3. Runtime-tunable without redeploy, exactly
 * like `resolveAiMode`. Non-positive / non-integer values are ignored.
 */
export async function resolveFreeDailyInputs(): Promise<number> {
  try {
    const fromEdge = asPositiveInt(await get<number | string>("freeDailyInputs"));
    if (fromEdge !== null) return fromEdge;
  } catch {
    // Edge Config unavailable locally / unconfigured — fall through.
  }
  const fromEnv = asPositiveInt(process.env.FREE_DAILY_INPUTS);
  return fromEnv ?? FREE_DAILY_INPUTS_FALLBACK;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/ai/limits.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/limits.ts src/lib/ai/limits.test.ts
git commit -m "feat(ai): resolveFreeDailyInputs runtime limit (Edge Config → env → 3)"
```

---

## Task 2: `UsageService` + `LocalUsageService` (date-keyed daily count)

**Files:**
- Create: `src/lib/usage/UsageService.ts`
- Create: `src/lib/usage/LocalUsageService.ts`
- Modify: `src/lib/auth/LocalAuthService.ts` (add `USAGE_KEY` to `PER_PROFILE_KEYS`)
- Test: `src/lib/usage/LocalUsageService.test.ts`

**Interfaces:**
- Consumes: nothing new (self-contained; keyed by a caller-provided storage key).
- Produces:
  - `interface UsageService { count(today: string): number; increment(today: string): void; remaining(today: string, limit: number): number }`.
  - `class LocalUsageService implements UsageService` — `new LocalUsageService(key: string)`; stores `{ date, count }`; a `today` different from the stored `date` reads as 0 and resets on the next `increment`.
  - `USAGE_KEY = "planner.usage.v1"` (base key, namespaced per profile by the caller via `profileKey`).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/usage/LocalUsageService.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { LocalUsageService, USAGE_KEY } from "./LocalUsageService";

const KEY = `${USAGE_KEY}:guest`;
const TODAY = "2026-07-22";
const TOMORROW = "2026-07-23";

describe("LocalUsageService", () => {
  beforeEach(() => localStorage.clear());

  it("counts 0 and full remaining before any use", () => {
    const u = new LocalUsageService(KEY);
    expect(u.count(TODAY)).toBe(0);
    expect(u.remaining(TODAY, 3)).toBe(3);
  });

  it("increments the count for today and reduces remaining", () => {
    const u = new LocalUsageService(KEY);
    u.increment(TODAY);
    u.increment(TODAY);
    expect(u.count(TODAY)).toBe(2);
    expect(u.remaining(TODAY, 3)).toBe(1);
  });

  it("clamps remaining at 0 (never negative)", () => {
    const u = new LocalUsageService(KEY);
    u.increment(TODAY);
    u.increment(TODAY);
    u.increment(TODAY);
    u.increment(TODAY);
    expect(u.remaining(TODAY, 3)).toBe(0);
  });

  it("resets automatically on a new local date (midnight reset)", () => {
    const u = new LocalUsageService(KEY);
    u.increment(TODAY);
    u.increment(TODAY);
    expect(u.count(TODAY)).toBe(2);
    // A new day: count is 0 again, and the first increment starts the new day at 1.
    expect(u.count(TOMORROW)).toBe(0);
    u.increment(TOMORROW);
    expect(u.count(TOMORROW)).toBe(1);
    expect(u.count(TODAY)).toBe(0); // stored date is now TOMORROW
  });

  it("persists across instances on the same key and isolates by key", () => {
    new LocalUsageService(KEY).increment(TODAY);
    expect(new LocalUsageService(KEY).count(TODAY)).toBe(1);
    expect(new LocalUsageService(`${USAGE_KEY}:other`).count(TODAY)).toBe(0);
  });

  it("tolerates corrupt JSON by reading as 0", () => {
    localStorage.setItem(KEY, "{not json");
    expect(new LocalUsageService(KEY).count(TODAY)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/usage/LocalUsageService.test.ts`
Expected: FAIL — `Cannot find module './LocalUsageService'`.

- [ ] **Step 3: Write the implementations**

```ts
// src/lib/usage/UsageService.ts
/** Swappable daily-usage meter (PRODUCT §14). A real backend implements the same shape. */
export interface UsageService {
  /** AI inputs used on local date `today` ("YYYY-MM-DD"). */
  count(today: string): number;
  /** Record one AI input for `today` (resets the stored count if the date rolled over). */
  increment(today: string): void;
  /** Remaining allowance for `today`, clamped to ≥ 0. */
  remaining(today: string, limit: number): number;
}
```

```ts
// src/lib/usage/LocalUsageService.ts
import type { UsageService } from "./UsageService";

/** Base key, namespaced per profile by the caller via profileKey(USAGE_KEY, id). */
export const USAGE_KEY = "planner.usage.v1";

interface Stored {
  date: string; // "YYYY-MM-DD"
  count: number;
}

/**
 * localStorage daily meter. The count belongs to a single local date; any read for
 * a different date is 0 (implicit local-midnight reset), and the next increment
 * starts that new date at 1. Tolerates missing/corrupt data as 0.
 */
export class LocalUsageService implements UsageService {
  constructor(private key: string) {}

  private read(): Stored | null {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(this.key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Stored;
      if (parsed && typeof parsed.date === "string" && typeof parsed.count === "number") return parsed;
      return null;
    } catch {
      return null;
    }
  }

  private write(value: Stored): void {
    if (typeof localStorage !== "undefined") localStorage.setItem(this.key, JSON.stringify(value));
  }

  count(today: string): number {
    const s = this.read();
    return s && s.date === today ? s.count : 0;
  }

  increment(today: string): void {
    this.write({ date: today, count: this.count(today) + 1 });
  }

  remaining(today: string, limit: number): number {
    return Math.max(0, limit - this.count(today));
  }
}
```

Then MODIFY `src/lib/auth/LocalAuthService.ts` so copy-on-sign-in carries usage forward. Change the `PER_PROFILE_KEYS` line (currently `const PER_PROFILE_KEYS = [TASKS_KEY];`):

```ts
import { USAGE_KEY } from "../usage/LocalUsageService";
// ...
/** Base keys namespaced per profile (copied on sign-in). */
const PER_PROFILE_KEYS = [TASKS_KEY, USAGE_KEY];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/usage/LocalUsageService.test.ts src/lib/auth/LocalAuthService.test.ts`
Expected: PASS (usage 6 tests; the existing auth suite still green — copy-on-sign-in now iterates 2 keys but the existing tests don't seed usage, so behavior is unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/lib/usage/UsageService.ts src/lib/usage/LocalUsageService.ts src/lib/usage/LocalUsageService.test.ts src/lib/auth/LocalAuthService.ts
git commit -m "feat(usage): date-keyed daily UsageService + carry usage on sign-in"
```

---

## Task 3: Surface `freeDailyInputs` in `/api/organize`

**Files:**
- Modify: `src/app/api/organize/route.ts`
- Modify: `src/lib/ai/organizeClient.ts`
- Test: `src/lib/ai/organizeClient.test.ts` (add a case; create the file if absent)

**Interfaces:**
- Consumes: `resolveFreeDailyInputs` (Task 1).
- Produces: `/api/organize` success + degraded JSON gains `freeDailyInputs: number`; `OrganizeResult` gains `freeDailyInputs: number` (client defaults to `3` if the field is missing).

- [ ] **Step 1: Write the failing client test**

```ts
// src/lib/ai/organizeClient.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { organize } from "./organizeClient";

afterEach(() => vi.restoreAllMocks());

describe("organize", () => {
  it("returns freeDailyInputs from the response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ tasks: [], degraded: false, freeDailyInputs: 5 }), { status: 200 }),
    );
    const result = await organize("hi");
    expect(result.freeDailyInputs).toBe(5);
  });

  it("defaults freeDailyInputs to 3 when the field is absent", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ tasks: [], degraded: false }), { status: 200 }),
    );
    const result = await organize("hi");
    expect(result.freeDailyInputs).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/ai/organizeClient.test.ts`
Expected: FAIL — `result.freeDailyInputs` is `undefined` (property not yet returned).

- [ ] **Step 3: Update the client + route**

In `src/lib/ai/organizeClient.ts` — extend the interface and the return:

```ts
export interface OrganizeResult {
  tasks: ParsedTask[];
  /** True when the server fell back to the deterministic parser (real AI was unavailable). */
  degraded: boolean;
  /** Free-tier daily AI-input allowance, echoed from the boundary (client defaults to 3). */
  freeDailyInputs: number;
}
```

In the `return` of `organize()`:

```ts
return {
  tasks: (json.tasks ?? []) as ParsedTask[],
  degraded: Boolean(json.degraded),
  freeDailyInputs: typeof json.freeDailyInputs === "number" ? json.freeDailyInputs : 3,
};
```

In `src/app/api/organize/route.ts` — import the resolver and include the number in both JSON responses:

```ts
import { resolveFreeDailyInputs } from "@/lib/ai/limits";
```

Resolve it once near the top of the `try` (after `resolveAiMode`), and add it to the success payload:

```ts
const freeDailyInputs = await resolveFreeDailyInputs();
// ... after building `tasks`:
return NextResponse.json({ tasks, degraded, freeDailyInputs });
```

(The 400 bad-input responses don't need it — the client only reads it on success.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/ai/organizeClient.test.ts && npm run typecheck`
Expected: PASS (2 tests); no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/organize/route.ts src/lib/ai/organizeClient.ts src/lib/ai/organizeClient.test.ts
git commit -m "feat(api): /api/organize echoes freeDailyInputs for client metering"
```

---

## Task 4: `BillingService` + entitlements on `AuthProvider`

**Files:**
- Create: `src/lib/billing/BillingService.ts`
- Create: `src/lib/billing/LocalBillingService.ts`
- Modify: `src/lib/auth/AuthProvider.tsx` (expose `isPro`, `upgrade`, `downgrade`)
- Test: `src/lib/billing/LocalBillingService.test.ts`
- Test: `src/lib/auth/AuthProvider.test.tsx` (add an upgrade case)

**Interfaces:**
- Consumes: `AuthService` (`current`, `setTier`) from M1.
- Produces:
  - `interface BillingService { isPro(): boolean; upgrade(): void; downgrade(): void }`.
  - `class LocalBillingService implements BillingService` — `new LocalBillingService(auth: AuthService)`; `isPro()` → `auth.current()?.tier === "pro"`; `upgrade()` → `auth.setTier("pro")`; `downgrade()` → `auth.setTier("free")`.
  - `useAuth()` gains: `isPro: boolean` (derived from `profile.tier`), `upgrade(): void`, `downgrade(): void` (delegate to a `LocalBillingService` held in the provider, then refresh).

- [ ] **Step 1: Write the failing billing test**

```ts
// src/lib/billing/LocalBillingService.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { LocalBillingService } from "./LocalBillingService";
import { LocalAuthService } from "../auth/LocalAuthService";

describe("LocalBillingService", () => {
  beforeEach(() => localStorage.clear());

  it("isPro is false for a fresh guest, true after upgrade, false after downgrade", () => {
    const auth = new LocalAuthService();
    auth.startGuest();
    const billing = new LocalBillingService(auth);
    expect(billing.isPro()).toBe(false);
    billing.upgrade();
    expect(billing.isPro()).toBe(true);
    expect(auth.current()?.tier).toBe("pro");
    billing.downgrade();
    expect(billing.isPro()).toBe(false);
    expect(auth.current()?.tier).toBe("free");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/billing/LocalBillingService.test.ts`
Expected: FAIL — `Cannot find module './LocalBillingService'`.

- [ ] **Step 3: Write billing + wire the provider**

```ts
// src/lib/billing/BillingService.ts
/** Swappable entitlements seam (PRODUCT §14). A real payment backend implements the same shape. */
export interface BillingService {
  isPro(): boolean;
  upgrade(): void;   // fake, instant
  downgrade(): void; // demo reset
}
```

```ts
// src/lib/billing/LocalBillingService.ts
import type { AuthService } from "../auth/types";
import type { BillingService } from "./BillingService";

/** Entitlements are the profile's tier; upgrade/downgrade flip it via the AuthService seam. */
export class LocalBillingService implements BillingService {
  constructor(private auth: AuthService) {}
  isPro(): boolean {
    return this.auth.current()?.tier === "pro";
  }
  upgrade(): void {
    this.auth.setTier("pro");
  }
  downgrade(): void {
    this.auth.setTier("free");
  }
}
```

In `src/lib/auth/AuthProvider.tsx`:

1. Add imports + a billing instance built over the same `active` service:

```ts
import { LocalBillingService } from "../billing/LocalBillingService";
```

```ts
// alongside `const [active] = useState(...)`:
const [billing] = useState(() => new LocalBillingService(active));
```

2. Extend `AuthContextValue`:

```ts
export interface AuthContextValue {
  profile: Profile | null;
  isPro: boolean;
  startGuest(): void;
  signIn(input: { emailOrName: string }): void;
  signOut(): void;
  markOrganized(): void;
  markSaved(): void;
  setTier(tier: Tier): void;
  upgrade(): void;
  downgrade(): void;
}
```

3. Add the actions + derived flag and include them in the memoized value:

```ts
const upgrade = useCallback(() => { billing.upgrade(); refresh(); }, [billing, refresh]);
const downgrade = useCallback(() => { billing.downgrade(); refresh(); }, [billing, refresh]);
const isPro = profile?.tier === "pro";

const value = useMemo<AuthContextValue>(
  () => ({ profile, isPro, startGuest, signIn, signOut, markOrganized, markSaved, setTier, upgrade, downgrade }),
  [profile, isPro, startGuest, signIn, signOut, markOrganized, markSaved, setTier, upgrade, downgrade],
);
```

- [ ] **Step 4: Add the provider upgrade test**

```tsx
// add to src/lib/auth/AuthProvider.test.tsx
it("upgrade flips isPro reactively; downgrade reverts it", () => {
  localStorage.clear();
  const { result } = renderHook(() => useAuth(), { wrapper });
  act(() => result.current.startGuest());
  expect(result.current.isPro).toBe(false);
  act(() => result.current.upgrade());
  expect(result.current.isPro).toBe(true);
  act(() => result.current.downgrade());
  expect(result.current.isPro).toBe(false);
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/lib/billing/LocalBillingService.test.ts src/lib/auth/AuthProvider.test.tsx && npm run typecheck`
Expected: PASS; no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/billing/BillingService.ts src/lib/billing/LocalBillingService.ts src/lib/billing/LocalBillingService.test.ts src/lib/auth/AuthProvider.tsx src/lib/auth/AuthProvider.test.tsx
git commit -m "feat(billing): entitlements seam + isPro/upgrade/downgrade on useAuth"
```

---

## Task 5: Free→Pro gate + usage metering in Capture

**Files:**
- Create: `src/components/billing/LimitReachedSheet.tsx`
- Modify: `src/components/screens/CaptureFlow.tsx`
- Test: `src/components/billing/LimitReachedSheet.test.tsx`
- Test: `src/components/screens/CaptureFlow.test.tsx` (add gate cases)

**Interfaces:**
- Consumes: `useAuth` (`profile`, `isPro`) (Task 4); `LocalUsageService`, `USAGE_KEY` (Task 2); `profileKey` (M1); `todayISO` (`src/lib/date/clock.ts`); `organize` → `freeDailyInputs` (Task 3); `BottomSheet`.
- Produces: `LimitReachedSheet` props `{ open; onClose(); used: number; limit: number }` — copy "You've used today's N AI inputs." + a **See Plans** `Link` to `/plans` + a "Not now" dismiss. CaptureFlow: builds a per-profile `LocalUsageService`; **before** `organize()`, if `!isPro` and `remaining ≤ 0` → open the sheet and return (no parse); on a successful `organize`, `increment` + cache `freeDailyInputs`; shows "N left today" for non-Pro.

- [ ] **Step 1: Write the failing LimitReachedSheet test**

```tsx
// src/components/billing/LimitReachedSheet.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LimitReachedSheet } from "./LimitReachedSheet";

describe("LimitReachedSheet", () => {
  it("shows the used count and links to Plans when open", () => {
    render(<LimitReachedSheet open used={3} limit={3} onClose={vi.fn()} />);
    expect(screen.getByText(/used today's 3 ai inputs/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see plans/i })).toHaveAttribute("href", "/plans");
  });

  it("renders nothing when closed", () => {
    const { container } = render(<LimitReachedSheet open={false} used={3} limit={3} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/billing/LimitReachedSheet.test.tsx`
Expected: FAIL — `Cannot find module './LimitReachedSheet'`.

- [ ] **Step 3: Write the sheet**

```tsx
// src/components/billing/LimitReachedSheet.tsx
"use client";

import Link from "next/link";
import { BottomSheet } from "@/components/ui/BottomSheet";

interface Props {
  open: boolean;
  onClose(): void;
  used: number;
  limit: number;
}

/** Free→Pro conversion moment (PRODUCT §14): non-blocking, dismissible. */
export function LimitReachedSheet({ open, onClose, used, limit }: Props) {
  return (
    <BottomSheet open={open} onClose={onClose} ariaLabel="Daily AI limit reached">
      <h2 className="text-lg font-medium">You&rsquo;re out of AI plans for today</h2>
      <p className="mt-1 text-text-secondary">
        You&rsquo;ve used today&rsquo;s {used} AI {limit === 1 ? "input" : "inputs"}. Upgrade to Pro for unlimited planning.
      </p>
      <Link
        href="/plans"
        className="mt-4 flex min-h-11 items-center justify-center rounded-full bg-fill-accent px-4 text-[15px] font-medium text-on-accent"
      >
        See Plans
      </Link>
      <button type="button" onClick={onClose} className="mt-2 min-h-11 w-full text-[15px] text-text-secondary">
        Not now
      </button>
    </BottomSheet>
  );
}
```

- [ ] **Step 4: Write the failing CaptureFlow gate test**

```tsx
// add to src/components/screens/CaptureFlow.test.tsx
// (uses the existing AuthProvider+SaveNudgeProvider wrapper helper in this file;
//  ensure the render helper wraps in SaveNudgeProvider as it already does post-M1.)
import { profileKey } from "@/lib/profile/profileKey";
import { USAGE_KEY } from "@/lib/usage/LocalUsageService";

it("blocks Plan it with the limit sheet when a non-Pro user is out of inputs", async () => {
  localStorage.clear();
  const service = new LocalAuthService();
  const guest = service.startGuest();
  // Pre-exhaust today's usage for this profile (default limit 3).
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(profileKey(USAGE_KEY, guest.id), JSON.stringify({ date: today, count: 3 }));
  renderCaptureWith(service); // helper renders CaptureFlow in AuthProvider(service)+SaveNudgeProvider
  await userEvent.type(screen.getByLabelText(/brain dump/i), "something");
  await userEvent.click(screen.getByRole("button", { name: /plan it/i }));
  expect(await screen.findByText(/out of ai plans for today/i)).toBeInTheDocument();
});
```

> Implementer note: add a `renderCaptureWith(service)` helper (or extend the existing one) that wraps `<CaptureFlow />` in `AuthProvider service={service}` + `SaveNudgeProvider` + a `TaskStoreProvider store={new MemoryTaskStore()}`. The default `freeDailyInputs` before any organize is `3`, so seeding `count: 3` guarantees the gate fires without a network call.

- [ ] **Step 5: Wire the gate + metering into CaptureFlow**

Add imports:

```ts
import { useMemo } from "react";
import { LocalUsageService, USAGE_KEY } from "@/lib/usage/LocalUsageService";
import { profileKey } from "@/lib/profile/profileKey";
import { todayISO } from "@/lib/date/clock";
import { LimitReachedSheet } from "@/components/billing/LimitReachedSheet";
```

In the component body, alongside the existing hooks:

```ts
const { profile, isPro, markOrganized } = useAuth(); // extend the existing destructure with isPro
const today = todayISO();
const usage = useMemo(
  () => new LocalUsageService(profileKey(USAGE_KEY, profile?.id ?? "guest")),
  [profile?.id],
);
const [limit, setLimit] = useState(3); // freeDailyInputs; updated from the organize response
const [used, setUsed] = useState(0);   // today's count, for the "N left" display + limit sheet
const [limitOpen, setLimitOpen] = useState(false);

// Seed `used` from storage once the profile is known (render-phase, no effect setState needed
// because `usage` is memoized on profile id — recompute on change):
// Use a small sync: read on each render is cheap and always current.
const usedToday = usage.count(today);
```

Replace `planIt()` with a gated version:

```ts
async function planIt() {
  if (!isPro && usage.remaining(today, limit) <= 0) {
    setUsed(usage.count(today));
    setLimitOpen(true);
    return; // non-blocking: no parse runs
  }
  setBusy(true);
  setError(null);
  try {
    const { tasks, degraded, freeDailyInputs } = await organize(text);
    setLimit(freeDailyInputs);
    if (!isPro) {
      usage.increment(today);
      setUsed(usage.count(today));
    }
    if (tasks.length > 0) markOrganized();
    setDegraded(degraded);
    setProposal(tasks);
  } catch (e) {
    setError((e as Error).message);
  } finally {
    setBusy(false);
  }
}
```

Add a "N left today" line for non-Pro users near the Plan it row (only when not first-run-empty), e.g. below the composer card:

```tsx
{!isPro && (
  <p className="text-[13px] text-text-muted">
    {Math.max(0, limit - usedToday)} of {limit} AI plans left today
  </p>
)}
```

Render the sheet at the end of the returned JSX (alongside `TipsSheet`/`VoiceComingSoonSheet`):

```tsx
<LimitReachedSheet open={limitOpen} onClose={() => setLimitOpen(false)} used={used} limit={limit} />
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- src/components/billing/LimitReachedSheet.test.tsx src/components/screens/CaptureFlow.test.tsx && npm run typecheck`
Expected: PASS (sheet 2 tests; CaptureFlow existing + new gate case); no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/billing/LimitReachedSheet.tsx src/components/billing/LimitReachedSheet.test.tsx src/components/screens/CaptureFlow.tsx src/components/screens/CaptureFlow.test.tsx
git commit -m "feat(capture): meter AI inputs + free→pro limit gate"
```

---

## Task 6: `(account)` route group + Plans screen

**Files:**
- Create: `src/app/(account)/layout.tsx`
- Create: `src/app/(account)/plans/page.tsx`
- Create: `src/components/screens/PlansScreen.tsx`
- Test: `src/components/screens/PlansScreen.test.tsx`

**Interfaces:**
- Consumes: `AuthProvider` (M1), `useAuth` (`profile`, `isPro`, `upgrade`, `downgrade`, `startGuest`) (Task 4).
- Produces:
  - `(account)/layout.tsx` — client-free server layout wrapping children in `<AuthProvider>` + a mobile column with a back link to `/today`; **no `TabBar`, no task store**.
  - `PlansScreen` (client) — Free vs Pro comparison; a **current-plan marker** from `profile?.tier`; **Upgrade to Pro** (`upgrade()`), shown when not Pro; **Downgrade to Free** (`downgrade()`), shown when Pro (demo reset); Pro features (voice / Week / notifications) tagged **coming soon**. If `profile` is null (pre-guest arriving via Welcome's "What's included"), show the comparison read-only with a **Get started** link to `/welcome` instead of Upgrade.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/screens/PlansScreen.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { LocalAuthService } from "@/lib/auth/LocalAuthService";
import { PlansScreen } from "./PlansScreen";

function renderPlans(service: LocalAuthService) {
  return render(
    <AuthProvider service={service}>
      <PlansScreen />
    </AuthProvider>,
  );
}

describe("PlansScreen", () => {
  beforeEach(() => localStorage.clear());

  it("upgrades a free user to Pro on tap", async () => {
    const service = new LocalAuthService();
    service.startGuest();
    service.signIn({ emailOrName: "sam@example.com" }); // free
    renderPlans(service);
    await userEvent.click(screen.getByRole("button", { name: /upgrade to pro/i }));
    expect(service.current()?.tier).toBe("pro");
  });

  it("shows a current-plan marker for a Pro user and offers downgrade", async () => {
    const service = new LocalAuthService();
    service.startGuest();
    service.setTier("pro");
    renderPlans(service);
    expect(screen.getByText(/current plan/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /downgrade to free/i }));
    expect(service.current()?.tier).toBe("free");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/screens/PlansScreen.test.tsx`
Expected: FAIL — `Cannot find module './PlansScreen'`.

- [ ] **Step 3: Write the layout + screen**

```tsx
// src/app/(account)/layout.tsx
import Link from "next/link";
import { IconChevronLeft } from "@tabler/icons-react";
import { AuthProvider } from "@/lib/auth/AuthProvider";

/** Account surfaces (Plans/Settings) — reactive to auth, off the tab bar (PRODUCT §15). */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-surface-2 text-text-primary">
        <header className="flex items-center gap-1 border-b border-border px-2 py-1.5">
          <Link href="/today" aria-label="Back" className="flex h-11 w-11 items-center justify-center text-text-secondary">
            <IconChevronLeft size={20} aria-hidden />
          </Link>
        </header>
        <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    </AuthProvider>
  );
}
```

```tsx
// src/components/screens/PlansScreen.tsx
"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/useAuth";

const PRO_SOON = ["Voice capture", "Week view", "Reminders & notifications"];

/** Free vs Pro (PRODUCT §14). Fake, one-tap upgrade — clearly a demo, no card. */
export function PlansScreen() {
  const { profile, isPro, upgrade, downgrade } = useAuth();
  const tier = profile?.tier ?? null;

  return (
    <section className="flex flex-1 flex-col gap-4 px-4 py-4">
      <header>
        <h1 className="text-xl font-medium">Plans</h1>
        <p className="mt-0.5 text-[13px] text-text-secondary">Upgrade any time — it&rsquo;s a demo, no card needed.</p>
      </header>

      <div className="rounded-xl border border-border bg-surface-1 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Free</h2>
          {!isPro && <span className="rounded-full bg-bg-accent px-2 py-0.5 text-xs text-text-accent">Current plan</span>}
        </div>
        <ul className="mt-2 space-y-1 text-[13px] text-text-secondary">
          <li>Full planner — Today, Inbox, editor</li>
          <li>A few AI plans per day</li>
        </ul>
      </div>

      <div className="rounded-xl border border-border-strong bg-surface-1 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Pro</h2>
          {isPro && <span className="rounded-full bg-bg-accent px-2 py-0.5 text-xs text-text-accent">Current plan</span>}
        </div>
        <ul className="mt-2 space-y-1 text-[13px] text-text-secondary">
          <li>Unlimited AI plans</li>
          {PRO_SOON.map((f) => (
            <li key={f}>
              {f} <span className="text-text-muted">· coming soon</span>
            </li>
          ))}
        </ul>
      </div>

      {tier === null ? (
        <Link
          href="/welcome"
          className="flex min-h-11 items-center justify-center rounded-full bg-fill-accent px-4 text-[15px] font-medium text-on-accent"
        >
          Get started
        </Link>
      ) : isPro ? (
        <button type="button" onClick={downgrade} className="min-h-11 text-[15px] text-text-secondary">
          Downgrade to Free
        </button>
      ) : (
        <button
          type="button"
          onClick={upgrade}
          className="min-h-11 rounded-full bg-fill-accent px-4 text-[15px] font-medium text-on-accent"
        >
          Upgrade to Pro
        </button>
      )}
    </section>
  );
}
```

```tsx
// src/app/(account)/plans/page.tsx
import { PlansScreen } from "@/components/screens/PlansScreen";

export default function PlansPage() {
  return <PlansScreen />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/screens/PlansScreen.test.tsx && npm run typecheck`
Expected: PASS (2 tests); no type errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(account)/layout.tsx" "src/app/(account)/plans/page.tsx" src/components/screens/PlansScreen.tsx src/components/screens/PlansScreen.test.tsx
git commit -m "feat(plans): (account) group + Plans screen with fake upgrade/downgrade"
```

---

## Task 7: Settings screen + gear entry points + Welcome "What's included"

**Files:**
- Create: `src/app/(account)/settings/page.tsx`
- Create: `src/components/screens/SettingsScreen.tsx`
- Create: `src/components/nav/SettingsGear.tsx`
- Modify: `src/components/screens/TodayScreen.tsx`, `src/components/screens/InboxScreen.tsx`, `src/components/screens/CaptureFlow.tsx` (add the gear to each header)
- Modify: `src/components/screens/WelcomeScreen.tsx` ("What's included" → `/plans`)
- Test: `src/components/screens/SettingsScreen.test.tsx`

**Interfaces:**
- Consumes: `useAuth` (`profile`, `isPro`) (Task 4); `TipsSheet` (`src/components/capture/TipsSheet.tsx`).
- Produces:
  - `SettingsScreen` (client) — an account line by tier (guest → "Sign in to save"; free → name/email; pro → "Pro"), a **Plan** row → `/plans` (shows "Free" / "Pro"), and a **Guidance** row that opens `TipsSheet`. (Show/hide-completed is intentionally NOT here — stays per screen.)
  - `SettingsGear` — a `Link` to `/settings` with an `IconSettings`, `aria-label="Settings"`, ≥44px; dropped into the three primary headers.
  - `WelcomeScreen` gains a **"What's included"** text link → `/plans`.

- [ ] **Step 1: Write the failing Settings test**

```tsx
// src/components/screens/SettingsScreen.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { LocalAuthService } from "@/lib/auth/LocalAuthService";
import { SettingsScreen } from "./SettingsScreen";

function renderSettings(service: LocalAuthService) {
  return render(
    <AuthProvider service={service}>
      <SettingsScreen />
    </AuthProvider>,
  );
}

describe("SettingsScreen", () => {
  beforeEach(() => localStorage.clear());

  it("shows the plan row linking to Plans, reflecting Free", () => {
    const service = new LocalAuthService();
    service.startGuest();
    renderSettings(service);
    const planLink = screen.getByRole("link", { name: /plan/i });
    expect(planLink).toHaveAttribute("href", "/plans");
    expect(planLink).toHaveTextContent(/free/i);
  });

  it("reflects Pro in the plan row after upgrade", () => {
    const service = new LocalAuthService();
    service.startGuest();
    service.setTier("pro");
    renderSettings(service);
    expect(screen.getByRole("link", { name: /plan/i })).toHaveTextContent(/pro/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/screens/SettingsScreen.test.tsx`
Expected: FAIL — `Cannot find module './SettingsScreen'`.

- [ ] **Step 3: Write Settings, the gear, and the wiring**

```tsx
// src/components/screens/SettingsScreen.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { IconChevronRight } from "@tabler/icons-react";
import { useAuth } from "@/lib/auth/useAuth";
import { TipsSheet } from "@/components/capture/TipsSheet";

/** Account/plan surface (PRODUCT §15). Show/hide-completed stays per screen — not here. */
export function SettingsScreen() {
  const { profile, isPro } = useAuth();
  const [tipsOpen, setTipsOpen] = useState(false);

  const account =
    profile == null || profile.tier === "guest"
      ? "Sign in to save your plan"
      : profile.email ?? profile.name ?? "Signed in";

  return (
    <section className="flex flex-1 flex-col gap-4 px-4 py-4">
      <header>
        <h1 className="text-xl font-medium">Settings</h1>
      </header>

      <div className="rounded-xl border border-border bg-surface-1">
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs text-text-muted">Account</p>
          <p className="mt-0.5">{account}</p>
        </div>
        <Link href="/plans" className="flex min-h-11 items-center justify-between px-4 py-3" aria-label="Plan">
          <span>Plan</span>
          <span className="flex items-center gap-1 text-text-secondary">
            {isPro ? "Pro" : "Free"}
            <IconChevronRight size={16} aria-hidden />
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setTipsOpen(true)}
          className="flex min-h-11 w-full items-center justify-between border-t border-border px-4 py-3 text-left"
        >
          <span>Guidance</span>
          <IconChevronRight size={16} className="text-text-secondary" aria-hidden />
        </button>
      </div>

      <TipsSheet open={tipsOpen} onClose={() => setTipsOpen(false)} />
    </section>
  );
}
```

```tsx
// src/components/nav/SettingsGear.tsx
"use client";

import Link from "next/link";
import { IconSettings } from "@tabler/icons-react";

/** Small entry point to /settings, dropped into the primary screen headers. */
export function SettingsGear() {
  return (
    <Link
      href="/settings"
      aria-label="Settings"
      className="flex h-11 w-11 items-center justify-center text-text-secondary"
    >
      <IconSettings size={20} aria-hidden />
    </Link>
  );
}
```

```tsx
// src/app/(account)/settings/page.tsx
import { SettingsScreen } from "@/components/screens/SettingsScreen";

export default function SettingsPage() {
  return <SettingsScreen />;
}
```

Wire the gear into the three headers (top-right):

- `TodayScreen.tsx` — wrap the header content so the gear sits at the right. Change the `<header className="pb-2 pt-4">…</header>` to:

```tsx
<header className="flex items-start justify-between pb-2 pt-4">
  <div>
    <h1 className="text-xl font-medium">Today</h1>
    <p className="mt-0.5 text-[13px] text-text-secondary">
      {formatFullDate(today)} · {completed.length} of {todays.length} done
    </p>
  </div>
  <SettingsGear />
</header>
```

- `InboxScreen.tsx` — same treatment: put its existing `<h1>`/count in a `<div>` and add `<SettingsGear />` as a sibling inside a `flex items-start justify-between` header.
- `CaptureFlow.tsx` — the header currently is `<header className="flex items-center pb-1"><DaysparkWordmark /></header>`; change to `justify-between` and add the gear:

```tsx
<header className="flex items-center justify-between pb-1">
  <DaysparkWordmark />
  <SettingsGear />
</header>
```

Add `import { SettingsGear } from "@/components/nav/SettingsGear";` to each of the three files.

In `WelcomeScreen.tsx` — add a "What's included" link (below the Get started / Sign in block, in both the sign-in and default branches' shared footer area):

```tsx
<Link href="/plans" className="text-center text-[13px] text-text-secondary underline">
  What&rsquo;s included
</Link>
```

(Add `import Link from "next/link";` to WelcomeScreen if not present.)

- [ ] **Step 4: Run tests + typecheck**

Run: `npm test -- src/components/screens/SettingsScreen.test.tsx src/components/screens/TodayScreen.test.tsx src/components/screens/InboxScreen.test.tsx src/components/screens/CaptureFlow.test.tsx src/components/screens/WelcomeScreen.test.tsx && npm run typecheck`
Expected: PASS — Settings 2 new; the three screen suites still green (the gear is additive; if any header query in an existing test broke, fix it minimally without weakening assertions).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(account)/settings/page.tsx" src/components/screens/SettingsScreen.tsx src/components/screens/SettingsScreen.test.tsx src/components/nav/SettingsGear.tsx src/components/screens/TodayScreen.tsx src/components/screens/InboxScreen.tsx src/components/screens/CaptureFlow.tsx src/components/screens/WelcomeScreen.tsx
git commit -m "feat(settings): Settings screen + gear entry points + Welcome What's-included link"
```

---

## Task 8: e2e (free hits limit → Plans → upgrade → unlimited) + M2 sweep

**Files:**
- Modify: `playwright.config.ts` (add `FREE_DAILY_INPUTS: "1"` to the hermetic webServer env)
- Create: `e2e/access-ladder-m2.spec.ts`

**Interfaces:**
- Consumes: the whole M2 flow. Fake AI mode + `FREE_DAILY_INPUTS=1` makes the limit reachable in one tap and deterministic.

- [ ] **Step 1: Set the test limit**

In `playwright.config.ts`, the hermetic webServer `env` currently is `{ ...process.env, EDGE_CONFIG: "", AI_MODE: "fake" }`. Add the limit:

```ts
env: { ...process.env, EDGE_CONFIG: "", AI_MODE: "fake", FREE_DAILY_INPUTS: "1" },
```

> With `EDGE_CONFIG=""`, `resolveFreeDailyInputs()` skips Edge Config and reads `FREE_DAILY_INPUTS=1`. Existing specs do at most one organize per profile, so a limit of 1 does not block them (the first tap is always allowed).

- [ ] **Step 2: Write the e2e test**

```ts
// e2e/access-ladder-m2.spec.ts
import { test, expect } from "@playwright/test";

test("a non-Pro user hits the daily limit, upgrades, and gets unlimited AI", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /get started/i }).click(); // guest

  // First plan — allowed (limit is 1), lands on Review.
  await page.getByRole("button", { name: /try an example/i }).click();
  await page.getByRole("button", { name: /plan it/i }).click();
  await expect(page.getByRole("button", { name: /add \d+ tasks?/i })).toBeVisible();
  await page.getByRole("button", { name: /add \d+ tasks?/i }).click();

  // Back on Capture, dump again and try to plan — now blocked by the limit sheet.
  await page.goto("/capture");
  await page.getByRole("button", { name: /try an example/i }).click();
  await page.getByRole("button", { name: /plan it/i }).click();
  await expect(page.getByText(/out of ai plans for today/i)).toBeVisible();

  // Go to Plans and upgrade.
  await page.getByRole("link", { name: /see plans/i }).click();
  await expect(page).toHaveURL(/\/plans/);
  await page.getByRole("button", { name: /upgrade to pro/i }).click();

  // Back to Capture — Pro now plans without the limit sheet.
  await page.goto("/capture");
  await page.getByRole("button", { name: /try an example/i }).click();
  await page.getByRole("button", { name: /plan it/i }).click();
  await expect(page.getByRole("button", { name: /add \d+ tasks?/i })).toBeVisible();
});
```

- [ ] **Step 3: Run the e2e**

Run: `npm run test:e2e -- access-ladder-m2`
Expected: PASS (1 test). If a concurrent dev server holds the `.next` lock, note it and rely on CI (Phase-1/M1 precedent); do not treat the lock as a failure.

- [ ] **Step 4: Full M2 sweep**

Run: `npm run lint && npm run typecheck && npm test && npm run test:e2e`
Expected: all green. Record the unit count (M1 ended at 194; M2 adds ~20+).

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts e2e/access-ladder-m2.spec.ts
git commit -m "test(e2e): free→pro limit-gate → upgrade → unlimited flow"
```

---

## Self-Review (completed while writing — notes for the implementer)

- **Spec coverage (M2).** `UsageService` daily metering + midnight reset (Task 2); limit surfaced via `/api/organize` response (Task 3); free→pro gate at the metered lever + limit-reached sheet (Task 5); `BillingService`/entitlements + fake upgrade/downgrade (Task 4); Plans screen (Task 6); Settings + gear + Welcome "What's included" (Task 7); e2e (Task 8). `freeDailyInputs` resolver (Task 1) backs the "runtime, no redeploy" §14 requirement. Show/hide-completed intentionally NOT centralized (Task 7). M3 (voice waitlist) remains its own plan.
- **Type consistency.** `UsageService` (`count`/`increment`/`remaining`) defined in Task 2, consumed verbatim in Task 5. `BillingService` (`isPro`/`upgrade`/`downgrade`) defined in Task 4, exposed on `useAuth` and used by Tasks 5/6/7. `OrganizeResult.freeDailyInputs` (Task 3) consumed in Task 5. `USAGE_KEY` is the single usage base key (Task 2), namespaced via `profileKey` in Tasks 2/5 and added to `PER_PROFILE_KEYS`. `profileKey`, `todayISO`, `useAuth`, `BottomSheet` reused as-is from M1/core.
- **Decisions flagged, not silent:** meter non-Pro (guest+free); `(account)` route group off the tab bar; "N left today" indicator (Global Constraints §M2-specific decisions).
- **Additive & non-breaking.** New seams + screens; the only edits to existing files are additive (`PER_PROFILE_KEYS`, `AuthContextValue`, the organize response field, headers gaining a gear, CaptureFlow's gate). Existing 194 unit + 7 e2e must stay green; where a header change trips an existing query, fix minimally without weakening.
- **Determinism.** e2e runs in fake mode with `FREE_DAILY_INPUTS=1` — the limit is reachable in one tap and reproducible with no API key.

## What comes after M2

- **M3 — Voice waitlist** (`WaitlistService` behind the mic teaser) — its own plan when reached.
- Milestone C's other items (needs-a-date, quick-add AI, robustness fixes) remain separately queued.
