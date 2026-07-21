# Access Ladder — Milestone M3 (Voice waitlist) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the voice mic teaser into a real **fake-door demand test** — tapping the mic logs interest and offers a **"Notify me"** waitlist (signed-in = one tap; guest = email field); a stateful mic shows "You're on the list" once joined — all behind a swappable `WaitlistService`.

**Architecture:** One new `localStorage` seam — `WaitlistService` (device-global: `join`, `hasJoined`, plus a minimal interest tap counter for the demand signal) — following the M1/M2 pattern. The existing `VoiceComingSoonSheet` becomes stateful, reading the signed-in email from `useAuth` and the joined state from `WaitlistService`. No real emails are sent (honest copy). Faked/client-side.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Vitest + RTL · Playwright.

**Design spec:** [docs/superpowers/specs/2026-07-21-access-ladder-design.md](../specs/2026-07-21-access-ladder-design.md) + PRODUCT §16 (voice teaser + waitlist). M3 was named as the third milestone of the approved access-ladder spec.

## Global Constraints

_Every task's requirements implicitly include this section. Values copied verbatim from PRODUCT §16._

- **Voice ships as a fake-door teaser, not a working feature.** The mic is disabled-grey; tapping opens the sheet. **No real email is sent** — copy stays honest ("we're building…", not "we've emailed you").
- **Waitlist ≠ registration.** Joining the waitlist NEVER creates an account or changes tier. A guest can join without signing in.
- **Lead shape:** `{ email: string; feature: "voice"; createdAt: string; userId?: string }`. Signed-in → email is known (from the profile), one-tap join; guest → an email field.
- **Stateful mic (PRODUCT §16):** not-joined → the "Notify me" sheet; already-joined → a "You're on the list" confirmation.
- **Every mic tap is logged** (a demand signal) via the waitlist seam's interest counter — independent of whether they join.
- **Everything faked + swappable** behind a small `src/lib` interface; a real backend replaces `LocalWaitlistService` without touching UI (CLAUDE.md non-negotiable).
- **Mobile-first** — ≥44px touch targets (`min-h-11`). TDD; KISS/YAGNI/DRY. Reuse `BottomSheet`, `useAuth`, design tokens.

### M3-specific decisions (flagged for confirmation at the review gate)
1. **`WaitlistService` is device-global** (one waitlist store per browser, keyed by `feature`), not per-profile. Rationale: the demand signal + "already joined" state is about this device/person regardless of guest-vs-signed-in, and dedup/linking is a real-backend concern (§16). The `userId?` field still records who joined. _If you'd rather scope the waitlist per-profile, say so and the key gets namespaced via `profileKey`._
2. **Include a minimal interest tap counter** (`recordInterest`/`interestCount`) so "every tap is logged" is real, even though there's no analytics backend yet. _Drop it if you'd rather not ship an unread counter (YAGNI); the join/hasJoined behavior stands alone._

---

## File Structure (M3)

- `src/lib/waitlist/WaitlistService.ts` — the interface.
- `src/lib/waitlist/LocalWaitlistService.ts` — `localStorage` impl + exported `WAITLIST_KEY`.
- `src/components/capture/VoiceComingSoonSheet.tsx` — MODIFY: stateful "Notify me" / "You're on the list".
- `src/components/screens/CaptureFlow.tsx` — MODIFY: the mic tap records interest (one line) before opening the sheet.
- `e2e/access-ladder-m3.spec.ts` — tap mic → join → reopen → "You're on the list".

---

# Milestone M3 — Voice waitlist

**Deliverable:** tapping the mic opens a "Talk instead of type — coming soon" sheet with a **Notify me** action; joining (one-tap when signed in, email field as a guest) flips the sheet to "You're on the list", which persists on reopen. Deployable; completes the access-ladder funnel's fake-door demand test.

---

## Task 1: `WaitlistService` + `LocalWaitlistService`

**Files:**
- Create: `src/lib/waitlist/WaitlistService.ts`
- Create: `src/lib/waitlist/LocalWaitlistService.ts`
- Test: `src/lib/waitlist/LocalWaitlistService.test.ts`

**Interfaces:**
- Consumes: `nowISO` (`src/lib/date/clock.ts`).
- Produces:
  - `type Feature = "voice"`.
  - `interface WaitlistLead { email: string; feature: Feature; createdAt: string; userId?: string }`.
  - `interface WaitlistService { join(lead: { email: string; feature: Feature; userId?: string }): void; hasJoined(feature: Feature): boolean; getLead(feature: Feature): WaitlistLead | null; recordInterest(feature: Feature): void; interestCount(feature: Feature): number }`.
  - `class LocalWaitlistService implements WaitlistService` — `new LocalWaitlistService(key?: string)` (default `WAITLIST_KEY`); device-global; stores `{ leads: Record<Feature, WaitlistLead>; interest: Record<Feature, number> }`. `join` is idempotent-ish (records the latest lead; keeps the earliest `createdAt`). Tolerates missing/corrupt JSON.
  - `WAITLIST_KEY = "planner.waitlist.v1"`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/waitlist/LocalWaitlistService.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { LocalWaitlistService, WAITLIST_KEY } from "./LocalWaitlistService";

describe("LocalWaitlistService", () => {
  beforeEach(() => localStorage.clear());

  it("has not joined before joining", () => {
    const w = new LocalWaitlistService();
    expect(w.hasJoined("voice")).toBe(false);
    expect(w.getLead("voice")).toBeNull();
  });

  it("records a join with the lead shape and persists it", () => {
    new LocalWaitlistService().join({ email: "sam@example.com", feature: "voice", userId: "u1" });
    const w = new LocalWaitlistService();
    expect(w.hasJoined("voice")).toBe(true);
    const lead = w.getLead("voice");
    expect(lead?.email).toBe("sam@example.com");
    expect(lead?.feature).toBe("voice");
    expect(lead?.userId).toBe("u1");
    expect(typeof lead?.createdAt).toBe("string");
  });

  it("keeps the earliest createdAt when joining twice", () => {
    const w = new LocalWaitlistService();
    w.join({ email: "a@example.com", feature: "voice" });
    const first = w.getLead("voice")!.createdAt;
    w.join({ email: "b@example.com", feature: "voice" });
    const lead = w.getLead("voice")!;
    expect(lead.email).toBe("b@example.com"); // latest email
    expect(lead.createdAt).toBe(first); // earliest timestamp preserved
  });

  it("counts interest taps independently of joining", () => {
    const w = new LocalWaitlistService();
    w.recordInterest("voice");
    w.recordInterest("voice");
    expect(w.interestCount("voice")).toBe(2);
    expect(w.hasJoined("voice")).toBe(false);
  });

  it("tolerates corrupt JSON as not-joined / zero interest", () => {
    localStorage.setItem(WAITLIST_KEY, "{not json");
    const w = new LocalWaitlistService();
    expect(w.hasJoined("voice")).toBe(false);
    expect(w.interestCount("voice")).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/waitlist/LocalWaitlistService.test.ts`
Expected: FAIL — `Cannot find module './LocalWaitlistService'`.

- [ ] **Step 3: Write the implementations**

```ts
// src/lib/waitlist/WaitlistService.ts
export type Feature = "voice";

export interface WaitlistLead {
  email: string;
  feature: Feature;
  createdAt: string; // ISO
  userId?: string;
}

/** Swappable fake-door waitlist (PRODUCT §16). A real backend implements the same shape. */
export interface WaitlistService {
  join(lead: { email: string; feature: Feature; userId?: string }): void;
  hasJoined(feature: Feature): boolean;
  getLead(feature: Feature): WaitlistLead | null;
  recordInterest(feature: Feature): void; // a mic tap — the demand signal
  interestCount(feature: Feature): number;
}
```

```ts
// src/lib/waitlist/LocalWaitlistService.ts
import type { Feature, WaitlistLead, WaitlistService } from "./WaitlistService";
import { nowISO } from "../date/clock";

export const WAITLIST_KEY = "planner.waitlist.v1";

interface Store {
  leads: Partial<Record<Feature, WaitlistLead>>;
  interest: Partial<Record<Feature, number>>;
}

/** Device-global localStorage waitlist. Faked demand test — never sends email, never creates an account. */
export class LocalWaitlistService implements WaitlistService {
  constructor(private key: string = WAITLIST_KEY) {}

  private read(): Store {
    const empty: Store = { leads: {}, interest: {} };
    if (typeof localStorage === "undefined") return empty;
    const raw = localStorage.getItem(this.key);
    if (!raw) return empty;
    try {
      const parsed = JSON.parse(raw) as Store;
      return {
        leads: parsed?.leads ?? {},
        interest: parsed?.interest ?? {},
      };
    } catch {
      return empty;
    }
  }

  private write(store: Store): void {
    if (typeof localStorage !== "undefined") localStorage.setItem(this.key, JSON.stringify(store));
  }

  join(lead: { email: string; feature: Feature; userId?: string }): void {
    const store = this.read();
    const existing = store.leads[lead.feature];
    store.leads[lead.feature] = {
      email: lead.email,
      feature: lead.feature,
      userId: lead.userId,
      createdAt: existing?.createdAt ?? nowISO(),
    };
    this.write(store);
  }

  hasJoined(feature: Feature): boolean {
    return this.read().leads[feature] != null;
  }

  getLead(feature: Feature): WaitlistLead | null {
    return this.read().leads[feature] ?? null;
  }

  recordInterest(feature: Feature): void {
    const store = this.read();
    store.interest[feature] = (store.interest[feature] ?? 0) + 1;
    this.write(store);
  }

  interestCount(feature: Feature): number {
    return this.read().interest[feature] ?? 0;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/waitlist/LocalWaitlistService.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/waitlist/WaitlistService.ts src/lib/waitlist/LocalWaitlistService.ts src/lib/waitlist/LocalWaitlistService.test.ts
git commit -m "feat(waitlist): device-global WaitlistService (join/hasJoined/interest)"
```

---

## Task 2: Stateful voice waitlist sheet

**Files:**
- Modify: `src/components/capture/VoiceComingSoonSheet.tsx`
- Modify: `src/components/screens/CaptureFlow.tsx` (mic tap records interest)
- Test: `src/components/capture/VoiceComingSoonSheet.test.tsx`

**Interfaces:**
- Consumes: `WaitlistService`/`LocalWaitlistService` (Task 1); `useAuth` (`profile`); `BottomSheet`.
- Produces: `VoiceComingSoonSheet` — when `open`, if not joined: the teaser + a **Notify me** action (signed-in with a known email → one-tap join using `profile.email`; guest or no email → an email input + Notify me); once joined: a **"You're on the list"** confirmation. Reads/writes via a `LocalWaitlistService` (device-global); records the lead's `userId` from `profile?.id`. Local component state flips to the joined view immediately on join, and the joined state is re-read from the service when the sheet reopens.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/capture/VoiceComingSoonSheet.test.tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { LocalAuthService } from "@/lib/auth/LocalAuthService";
import { LocalWaitlistService } from "@/lib/waitlist/LocalWaitlistService";
import { VoiceComingSoonSheet } from "./VoiceComingSoonSheet";

function renderSheet(service: LocalAuthService, open = true) {
  return render(
    <AuthProvider service={service}>
      <VoiceComingSoonSheet open={open} onClose={vi.fn()} />
    </AuthProvider>,
  );
}

describe("VoiceComingSoonSheet", () => {
  beforeEach(() => localStorage.clear());

  it("lets a guest join with an email field, then shows the joined state", async () => {
    const auth = new LocalAuthService();
    auth.startGuest();
    renderSheet(auth);
    await userEvent.type(screen.getByLabelText(/email/i), "guest@example.com");
    await userEvent.click(screen.getByRole("button", { name: /notify me/i }));
    expect(screen.getByText(/you're on the list/i)).toBeInTheDocument();
    expect(new LocalWaitlistService().getLead("voice")?.email).toBe("guest@example.com");
  });

  it("one-tap joins a signed-in user using their known email (no email field)", async () => {
    const auth = new LocalAuthService();
    auth.startGuest();
    auth.signIn({ emailOrName: "sam@example.com" }); // free, email known
    renderSheet(auth);
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /notify me/i }));
    expect(screen.getByText(/you're on the list/i)).toBeInTheDocument();
    expect(new LocalWaitlistService().getLead("voice")?.email).toBe("sam@example.com");
  });

  it("shows the joined state on open when already on the list", () => {
    const auth = new LocalAuthService();
    auth.startGuest();
    new LocalWaitlistService().join({ email: "prev@example.com", feature: "voice" });
    renderSheet(auth);
    expect(screen.getByText(/you're on the list/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /notify me/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/capture/VoiceComingSoonSheet.test.tsx`
Expected: FAIL — the current sheet has no "Notify me" / joined state.

- [ ] **Step 3: Rewrite the sheet**

```tsx
// src/components/capture/VoiceComingSoonSheet.tsx
"use client";

import { useMemo, useState } from "react";
import { IconMicrophone, IconCheck } from "@tabler/icons-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useAuth } from "@/lib/auth/useAuth";
import { LocalWaitlistService } from "@/lib/waitlist/LocalWaitlistService";

/**
 * Voice fake-door (PRODUCT §16) — a real demand test. Tapping the mic offers a
 * "Notify me" waitlist (signed-in = one tap; guest = email field) and, once joined,
 * shows "You're on the list". No email is ever sent; joining is not registration.
 */
export function VoiceComingSoonSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const { profile } = useAuth();
  const waitlist = useMemo(() => new LocalWaitlistService(), []);
  // Seed from storage each time the sheet mounts/opens; local state flips on join.
  const [joined, setJoined] = useState(() => waitlist.hasJoined("voice"));
  const [email, setEmail] = useState("");
  const knownEmail = profile?.email ?? "";

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    waitlist.join({ email: trimmed, feature: "voice", userId: profile?.id });
    setJoined(true);
  };

  return (
    <BottomSheet open={open} onClose={onClose} ariaLabel="Voice capture">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bg-accent text-text-accent">
          <IconMicrophone size={20} aria-hidden />
        </span>
        <div>
          <p className="text-[15px] font-medium">Talk instead of type</p>
          <p className="text-[13px] text-text-secondary">Voice capture — coming soon.</p>
        </div>
      </div>

      {joined ? (
        <p className="mt-4 flex items-center gap-2 text-[15px] text-text-primary">
          <IconCheck size={18} className="text-text-accent" aria-hidden />
          You&rsquo;re on the list — we&rsquo;ll let you know when voice lands.
        </p>
      ) : knownEmail ? (
        <div className="mt-4">
          <p className="text-[13px] text-text-secondary">Want a heads-up when it&rsquo;s ready?</p>
          <button
            type="button"
            onClick={() => submit(knownEmail)}
            className="mt-2 min-h-11 rounded-full bg-fill-accent px-4 text-[15px] font-medium text-on-accent"
          >
            Notify me
          </button>
        </div>
      ) : (
        <form
          className="mt-4 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit(email);
          }}
        >
          <p className="text-[13px] text-text-secondary">Want a heads-up when it&rsquo;s ready?</p>
          <input
            aria-label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="min-h-11 rounded-lg border border-border bg-surface-2 px-3 text-base outline-none"
          />
          <button
            type="submit"
            disabled={!email.trim()}
            className="min-h-11 rounded-full bg-fill-accent px-4 text-[15px] font-medium text-on-accent disabled:opacity-50"
          >
            Notify me
          </button>
        </form>
      )}
    </BottomSheet>
  );
}
```

- [ ] **Step 4: Record the mic tap in CaptureFlow**

In `src/components/screens/CaptureFlow.tsx`, add near the other lib imports:

```ts
import { LocalWaitlistService } from "@/lib/waitlist/LocalWaitlistService";
```

Add a memoized instance alongside the other hooks (reuse the existing `useMemo` import):

```ts
const waitlist = useMemo(() => new LocalWaitlistService(), []);
```

Change the mic button's handler (currently `onClick={() => setVoiceOpen(true)}`) to log interest first:

```tsx
onClick={() => {
  waitlist.recordInterest("voice");
  setVoiceOpen(true);
}}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npm test -- src/components/capture/VoiceComingSoonSheet.test.tsx src/components/screens/CaptureFlow.test.tsx && npm run typecheck`
Expected: PASS (sheet 3 new; CaptureFlow existing suite still green — the mic change is additive; if an existing CaptureFlow test asserted the old sheet copy, fix it minimally). No type errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/capture/VoiceComingSoonSheet.tsx src/components/capture/VoiceComingSoonSheet.test.tsx src/components/screens/CaptureFlow.tsx
git commit -m "feat(voice): stateful waitlist sheet + log mic interest taps"
```

---

## Task 3: e2e (tap mic → join → reopen shows joined) + M3 sweep

**Files:**
- Create: `e2e/access-ladder-m3.spec.ts`

**Interfaces:**
- Consumes: the M3 flow. Fake AI mode (deterministic).

- [ ] **Step 1: Write the e2e test**

```ts
// e2e/access-ladder-m3.spec.ts
import { test, expect } from "@playwright/test";

test("guest joins the voice waitlist and sees the joined state on reopen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /get started/i }).click(); // guest → /capture

  // Open the voice teaser and join with an email.
  await page.getByRole("button", { name: /voice input, coming soon/i }).click();
  await expect(page.getByText(/talk instead of type/i)).toBeVisible();
  await page.getByLabel(/email/i).fill("guest@example.com");
  await page.getByRole("button", { name: /notify me/i }).click();
  await expect(page.getByText(/you're on the list/i)).toBeVisible();

  // Close and reopen — the joined state persists.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /voice input, coming soon/i }).click();
  await expect(page.getByText(/you're on the list/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /notify me/i })).toHaveCount(0);
});
```

- [ ] **Step 2: Run the e2e**

Run: `npm run test:e2e -- access-ladder-m3`
Expected: PASS (1 test). If blocked by a concurrent dev server's `.next` lock, note it and rely on CI (M1/M2 precedent) — don't treat the lock as a failure.

- [ ] **Step 3: Full M3 sweep**

Run: `npm run lint && npm run typecheck && npm test && npm run test:e2e`
Expected: all green. Record the unit count (M2 ended at 224; M3 adds ~8).

- [ ] **Step 4: Commit**

```bash
git add e2e/access-ladder-m3.spec.ts
git commit -m "test(e2e): voice waitlist join → persisted joined state"
```

---

## Self-Review (completed while writing — notes for the implementer)

- **Spec coverage (M3 / PRODUCT §16).** Fake-door teaser (existing copy kept); **Notify me** waitlist with the exact lead shape (Task 1); signed-in one-tap vs guest email field (Task 2); stateful mic — joined shows "You're on the list", persists on reopen (Task 2 + e2e); every tap logged via `recordInterest` (Task 2 mic handler); waitlist ≠ registration (join never calls Auth/setTier — verify no auth mutation in the diff); honest copy (no "email sent" claim).
- **Type consistency.** `WaitlistLead`/`Feature`/`WaitlistService` defined once (Task 1), consumed by the sheet (Task 2). `WAITLIST_KEY` is the single storage base. `useAuth().profile` (`.email`, `.id`) reused as-is from M1.
- **Decisions flagged, not silent:** device-global waitlist; interest tap counter (Global Constraints §M3-specific decisions).
- **Additive & non-breaking.** New seam + a rewritten teaser sheet (same props `{ open, onClose }`, so CaptureFlow's usage is unchanged apart from the one-line interest log). Existing 224 unit + 8 e2e must stay green; where an existing test asserted the old sheet copy, fix minimally without weakening.
- **Determinism.** e2e runs in fake mode; the waitlist is pure localStorage, no network.

## What comes after M3

- The access-ladder funnel is complete (guest → free → pro + voice fake-door). **Deferred follow-ups** from M1/M2 reviews remain (extract `useIsHydrated()`; PlansScreen pre-guest test; Downgrade padding; client-tz `today` into `/api/organize`).
- **Milestone C** — needs-a-date (`needsDate` flag), quick-add AI entry points, empty-parse UX, deadline-badge tone — its own brainstorm → plan.
