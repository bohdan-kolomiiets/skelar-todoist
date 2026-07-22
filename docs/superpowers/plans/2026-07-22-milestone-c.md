# Milestone C + Cleanups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining core-flow polish — Needs-a-date, quick-add AI, empty/edge handling, user-clock dates with relative offsets, a Welcome gate that actually guards the app, Capture composer polish — plus the accumulated review cleanups.

**Architecture:** Additive on the shipped app. A shared `useIsHydrated()` hook removes the duplicated `useSyncExternalStore` hydration trio and powers a `(app)`-group Welcome guard. A shared `useGatedOrganize()` hook lifts the M2 metering gate out of `CaptureFlow` so Capture and the new `QuickAddSheet` meter identically. `needsDate` flows from the AI schema + fake parser into a new Inbox section. Dates resolve against the client's `today`.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Vitest + RTL · Playwright · `ai`/`zod` (parser) · `@vercel/edge-config`.

**Design spec:** [docs/superpowers/specs/2026-07-22-milestone-c-design.md](../specs/2026-07-22-milestone-c-design.md).

## Global Constraints

_Every task's requirements implicitly include this section. Values copied verbatim from the spec / PRODUCT.md._

- **The `Task`/`ParsedTask` schema is the locked UI↔AI contract** (PRODUCT §3). This plan adds only the already-reserved optional `needsDate?: boolean` (present on `Task`/`ParsedTask` types since M-A) — now also to the **AI output schema**.
- **Routing** (§4): `doDate === today` → Today; `null`/future → Inbox. **Ambiguity → don't guess**: unclear dates/times leave `doDate` null, keep raw wording, and the task is flagged **`needsDate`** (Inbox "Needs a date" section).
- **Metering** (§14): one AI parse (Capture *Plan it* **or** quick-add *Parse with AI*) = **one daily input**, gated by `freeDailyInputs` for non-Pro; Pro unlimited. *Enter manually* and all non-AI actions are free. Capture + quick-add share one gate (`useGatedOrganize`).
- **Empty parse (0 tasks)** → stay on the composer, inline notice **"I couldn't find any tasks in that — try rephrasing."**, keep the input; the AI input still counted.
- **Deadline badge** (§6): neutral far-future (>7 days), warning within 7 days, danger overdue.
- **Empty-state copy** (§10, verbatim): Today+Inbox-has-items → "Nothing planned — capture your thoughts or pull from Inbox"; Today+Inbox-empty → "Nothing planned — capture your thoughts"; Inbox empty → "Inbox zero — nothing waiting, capture your thoughts".
- **Quick-add** (§9): `+ Add task` opens a free-text field (AI default) + *Enter manually* escape; **count decides the surface** — one task → the editor, several → Review; the controls editor is always the final step.
- **Welcome gate** (§12/§13): pre-guest (`AuthService.current() === null`) is routed to `/welcome`; `(app)` pages (`/capture`,`/today`,`/inbox`) must enforce this, **not** the `(account)` pages (`/plans`,`/settings`).
- **Hydration-safe** — never `setState` in an effect (lint rule `react-hooks/set-state-in-effect`); the shared `useIsHydrated()` + during-render adoption is the only pattern. Guards/redirects fire **only after hydration** (no SSR/first-render redirect).
- **Everything faked + swappable**; secrets server-side; mobile-first ≥44px; TDD; KISS/YAGNI/DRY. Reuse `BottomSheet`, `TaskEditorSheet`, `ReviewScreen`, `useAuth`, `useTasks`, design tokens.

---

## Scope — one plan, four grouped milestones (built in order)

- **C1 — Robustness + cleanups** (Tasks 1–8): `useIsHydrated`, Welcome guard, deadline 3-tier, client-tz `today` + relative offsets, `useGatedOrganize` + empty-parse, Capture chip/padding, review roll-ups.
- **C2 — Needs-a-date** (Tasks 9–10): AI flag + fake-parser detection; Inbox section.
- **C3 — Quick-add AI** (Tasks 11–12): `QuickAddSheet` + wiring + e2e.
- **C4 — Pull-from-Inbox** (Task 13): Today empty-state link.
- **Finish** (Task 14): needs-a-date e2e + full sweep + PROGRESS.

## File Structure

**New:**
- `src/lib/hooks/useIsHydrated.ts` — the hydration flag hook.
- `src/components/auth/RequireProfile.tsx` — `(app)`-group Welcome guard.
- `src/lib/ai/useGatedOrganize.ts` — shared metering-gated organize hook.
- `src/components/task/QuickAddSheet.tsx` — quick-add "New task" sheet.

**Modified:** `src/lib/auth/AuthProvider.tsx`, `src/lib/tasks/TaskStoreProvider.tsx`, `src/lib/preferences/usePersistentState.ts`, `src/components/screens/CaptureFlow.tsx`, `src/app/(app)/layout.tsx`, `src/components/task/DeadlineBadge.tsx`, `src/lib/ai/organizeClient.ts`, `src/app/api/organize/route.ts`, `src/lib/ai/prompt.ts`, `src/lib/ai/fakeParser.ts`, `src/lib/ai/schema.ts`, `src/lib/ai/fixtures/parseCases.ts`, `src/lib/task/ordering.ts`, `src/components/screens/InboxScreen.tsx`, `src/components/screens/TodayScreen.tsx`, `src/components/screens/PlansScreen.tsx`, `src/components/capture/VoiceComingSoonSheet.tsx`, `src/components/task/TaskEditorSheet.tsx`, `src/components/task/TaskRow.tsx`.

---

# C1 — Robustness + cleanups

## Task 1: `useIsHydrated()` hook + dedupe

**Files:**
- Create: `src/lib/hooks/useIsHydrated.ts`
- Create: `src/lib/hooks/useIsHydrated.test.ts`
- Modify: `src/lib/auth/AuthProvider.tsx`, `src/lib/tasks/TaskStoreProvider.tsx`, `src/lib/preferences/usePersistentState.ts`, `src/components/screens/CaptureFlow.tsx` (replace their inline trio with the hook)

**Interfaces:**
- Produces: `useIsHydrated(): boolean` — `false` on the server and the client's first (hydration) render, `true` afterward.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/hooks/useIsHydrated.test.ts
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useIsHydrated } from "./useIsHydrated";

describe("useIsHydrated", () => {
  it("is true after the client render commits", () => {
    const { result } = renderHook(() => useIsHydrated());
    expect(result.current).toBe(true); // renderHook runs a client (CSR) render
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/hooks/useIsHydrated.test.ts`
Expected: FAIL — `Cannot find module './useIsHydrated'`.

- [ ] **Step 3: Write the hook**

```ts
// src/lib/hooks/useIsHydrated.ts
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
```

- [ ] **Step 4: Refactor the four consumers to use it (behavior-preserving)**

In `AuthProvider.tsx`, `TaskStoreProvider.tsx`, `usePersistentState.ts`, and `CaptureFlow.tsx`: delete the local `neverSubscribe`/`getIsHydratedOnClient`/`getIsHydratedOnServer` constants and the `useSyncExternalStore(...)` call, replace with `const isHydrated = useIsHydrated();` (import from `@/lib/hooks/useIsHydrated`). Leave all other logic (the `if (isHydrated && !loaded) { ... }` adoption blocks) untouched.

- [ ] **Step 5: Run the affected suites + typecheck + lint**

Run: `npm test -- src/lib/hooks src/lib/auth src/lib/tasks src/lib/preferences src/components/screens/CaptureFlow.test.tsx && npm run typecheck && npm run lint`
Expected: PASS (new hook test + all four consumers' existing tests still green); no type/lint errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/hooks/useIsHydrated.ts src/lib/hooks/useIsHydrated.test.ts src/lib/auth/AuthProvider.tsx src/lib/tasks/TaskStoreProvider.tsx src/lib/preferences/usePersistentState.ts src/components/screens/CaptureFlow.tsx
git commit -m "refactor(hooks): extract useIsHydrated() and dedupe the hydration trio"
```

---

## Task 2: Welcome guard on the `(app)` group

**Files:**
- Create: `src/components/auth/RequireProfile.tsx`
- Modify: `src/app/(app)/layout.tsx`
- Test: `src/components/auth/RequireProfile.test.tsx`

**Interfaces:**
- Consumes: `useAuth` (`profile`), `useIsHydrated` (Task 1), `useRouter` (`next/navigation`).
- Produces: `RequireProfile` — once hydrated, if `profile === null` calls `router.replace("/welcome")` and renders nothing; otherwise renders `children`. Pre-hydration it renders `children` (no redirect, no flash beyond what the app already shows).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/auth/RequireProfile.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

import { AuthProvider } from "@/lib/auth/AuthProvider";
import { LocalAuthService } from "@/lib/auth/LocalAuthService";
import { RequireProfile } from "./RequireProfile";

function renderGuard(service: LocalAuthService) {
  return render(
    <AuthProvider service={service}>
      <RequireProfile>
        <div>protected</div>
      </RequireProfile>
    </AuthProvider>,
  );
}

describe("RequireProfile", () => {
  beforeEach(() => { localStorage.clear(); replace.mockClear(); });

  it("redirects a pre-guest visitor to /welcome and hides children", () => {
    renderGuard(new LocalAuthService());
    expect(replace).toHaveBeenCalledWith("/welcome");
    expect(screen.queryByText("protected")).not.toBeInTheDocument();
  });

  it("renders children for a guest and does not redirect", () => {
    const service = new LocalAuthService();
    service.startGuest();
    renderGuard(service);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText("protected")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/auth/RequireProfile.test.tsx`
Expected: FAIL — `Cannot find module './RequireProfile'`.

- [ ] **Step 3: Write the guard + wire the layout**

```tsx
// src/components/auth/RequireProfile.tsx
"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { useIsHydrated } from "@/lib/hooks/useIsHydrated";

/**
 * Gate the app behind a profile (PRODUCT §12/§13): once hydrated, a pre-guest
 * (no profile) is sent to /welcome. Pre-hydration renders children so the server
 * and first client render agree (no SSR redirect). Only wraps the (app) group;
 * /plans and /settings stay reachable pre-guest.
 */
export function RequireProfile({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { profile } = useAuth();
  const isHydrated = useIsHydrated();

  if (isHydrated && profile === null) {
    router.replace("/welcome");
    return null;
  }
  return <>{children}</>;
}
```

In `src/app/(app)/layout.tsx`, wrap the existing shell in `RequireProfile` (inside `AuthProvider`, around `ProfileTaskStore`):

```tsx
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { RequireProfile } from "@/components/auth/RequireProfile";
import { ProfileTaskStore } from "@/lib/tasks/ProfileTaskStore";
import { SaveNudgeProvider } from "@/lib/nudge/SaveNudgeProvider";
import { TabBar } from "@/components/nav/TabBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RequireProfile>
        <SaveNudgeProvider>
          <ProfileTaskStore>
            <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-surface-2 text-text-primary">
              <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
              <TabBar />
            </div>
          </ProfileTaskStore>
        </SaveNudgeProvider>
      </RequireProfile>
    </AuthProvider>
  );
}
```

> Keep the current provider nesting order for `SaveNudgeProvider`/`ProfileTaskStore` as it exists in the file today; only add `RequireProfile` as the outer wrapper inside `AuthProvider`. (If the live file nests `SaveNudgeProvider` outside `ProfileTaskStore`, preserve that — just insert `RequireProfile` directly under `AuthProvider`.)

- [ ] **Step 4: Run tests + typecheck**

Run: `npm test -- src/components/auth/RequireProfile.test.tsx && npm run typecheck`
Expected: PASS (2 tests); no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/RequireProfile.tsx src/components/auth/RequireProfile.test.tsx "src/app/(app)/layout.tsx"
git commit -m "feat(auth): guard the (app) group — pre-guest visitors routed to Welcome"
```

---

## Task 3: Deadline badge 3-tier

**Files:**
- Modify: `src/components/task/DeadlineBadge.tsx`
- Test: `src/components/task/DeadlineBadge.test.tsx`

**Interfaces:**
- Consumes: `deadlineBadge` (`src/lib/date/format.ts`, returns `{ label, tone: "normal"|"warning"|"danger" }`), `Chip`.
- Produces: `DeadlineBadge` renders the badge's real tone (neutral for far-future) — no `normal→warning` upgrade.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/task/DeadlineBadge.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DeadlineBadge } from "./DeadlineBadge";

const TODAY = "2026-07-20";
// Chip renders tone via classes; assert the neutral tone is NOT the warning bg.
function toneClasses(el: HTMLElement) {
  return el.querySelector("span")?.className ?? "";
}

describe("DeadlineBadge tones", () => {
  it("far-future deadline is neutral (not warning)", () => {
    const { container } = render(<DeadlineBadge deadline="2026-08-15" today={TODAY} />);
    expect(toneClasses(container)).toContain("bg-surface-1"); // neutral Chip tone
    expect(toneClasses(container)).not.toContain("bg-bg-warning");
  });
  it("within-7-days deadline is warning", () => {
    const { container } = render(<DeadlineBadge deadline="2026-07-23" today={TODAY} />);
    expect(toneClasses(container)).toContain("bg-bg-warning");
  });
  it("overdue deadline is danger", () => {
    const { container } = render(<DeadlineBadge deadline="2026-07-18" today={TODAY} />);
    expect(toneClasses(container)).toContain("bg-bg-danger");
  });
});
```

> Confirm the exact Chip tone class strings against `src/components/task/Chip.tsx` (the `tones` map) before finalizing the assertions; use whatever the neutral/`normal`, `warning`, `danger` variants actually emit.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/task/DeadlineBadge.test.tsx`
Expected: FAIL — the far-future case currently renders `bg-bg-warning` (normal is upgraded to warning).

- [ ] **Step 3: Fix the component**

```tsx
// src/components/task/DeadlineBadge.tsx
import { deadlineBadge } from "@/lib/date/format";
import { Chip } from "./Chip";

export function DeadlineBadge({ deadline, today }: { deadline: string; today: string }) {
  const { label, tone } = deadlineBadge(deadline, today);
  return <Chip tone={tone}>{label}</Chip>;
}
```

- [ ] **Step 4: Run test + the full task suite**

Run: `npm test -- src/components/task/DeadlineBadge.test.tsx src/components/task/TaskRow.test.tsx && npm run typecheck`
Expected: PASS (3 tiers; TaskRow unaffected).

- [ ] **Step 5: Commit**

```bash
git add src/components/task/DeadlineBadge.tsx src/components/task/DeadlineBadge.test.tsx
git commit -m "fix(task): deadline badge honors §6 three tiers (neutral far-future)"
```

---

## Task 4: Client-tz `today` + relative offsets

**Files:**
- Modify: `src/lib/ai/organizeClient.ts` (send `today`)
- Modify: `src/app/api/organize/route.ts` (read/validate `today`, pass to both parsers)
- Modify: `src/lib/ai/prompt.ts` (relative-offset rules)
- Modify: `src/lib/ai/fakeParser.ts` (resolve `in N days` / `next week` / `in N weeks`)
- Modify: `src/lib/ai/fixtures/parseCases.ts` (golden case)
- Test: `src/lib/ai/fakeParser.test.ts` (add cases), `src/lib/ai/organizeClient.test.ts` (sends today)

**Interfaces:**
- Consumes: `todayISO` (`src/lib/date/clock.ts`).
- Produces: `organize(text)` posts `{ text, today }`; the route resolves `today = body.today (validated YYYY-MM-DD) ?? todayISO()` and constructs `new FakeTaskParser({ today })` / `new GatewayTaskParser({ model, apiKey, today })`; `FakeTaskParser` resolves `in N days` (→ `today+N`), `next week`/`in a week` (→ `today+7`), `in N weeks` (→ `today+7N`).

- [ ] **Step 1: Write the failing tests**

```ts
// add to src/lib/ai/fakeParser.test.ts
import { FakeTaskParser } from "./fakeParser";
const TODAY = "2026-07-20";

it("resolves 'in N days' to today+N", async () => {
  const [t] = await new FakeTaskParser({ today: TODAY }).parse("grab delivery in 5 days");
  expect(t.doDate).toBe("2026-07-25");
  expect(t.title).toBe("Grab delivery");
});
it("resolves 'next week' / 'in a week' to today+7", async () => {
  const [a] = await new FakeTaskParser({ today: TODAY }).parse("email supplier next week");
  expect(a.doDate).toBe("2026-07-27");
});
it("resolves 'in N weeks' to today+7N", async () => {
  const [t] = await new FakeTaskParser({ today: TODAY }).parse("renew pass in 2 weeks");
  expect(t.doDate).toBe("2026-08-03");
});
```

```ts
// add to src/lib/ai/organizeClient.test.ts
it("sends the client's today with the request", async () => {
  const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ tasks: [], degraded: false, freeDailyInputs: 3 }), { status: 200 }),
  );
  await organize("hi");
  const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
  expect(body).toHaveProperty("today");
  expect(body.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/ai/fakeParser.test.ts src/lib/ai/organizeClient.test.ts`
Expected: FAIL — offsets unresolved (routes to today), and no `today` in the request body.

- [ ] **Step 3: Implement**

`organizeClient.ts` — send today:

```ts
import { todayISO } from "@/lib/date/clock";
// ...in organize():
body: JSON.stringify({ text, today: todayISO() }),
```

`route.ts` — read/validate + pass through:

```ts
// after parsing the body's `text`, also read `today`:
let today: unknown;
try { ({ text, today } = await request.json()); } catch { /* existing 400 */ }
const clientToday = typeof today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(today) ? today : todayISO();
// import { todayISO } from "@/lib/date/clock";
// then construct parsers with it:
parsed = await new GatewayTaskParser({ model, apiKey: process.env.AI_API_KEY, today: clientToday }).parse(text);
// fallback + fake branches:
parsed = await new FakeTaskParser({ today: clientToday }).parse(text);
```

`prompt.ts` — add offset rules after the `doDate` bullet:

```ts
"  Relative offsets resolve against today's date: 'in N days' → today+N;",
"  'next week' / 'in a week' → today+7; 'in N weeks' → today+7*N. Put the result in doDate.",
```

`fakeParser.ts` — add offset resolution. In `parseClause`, before the final `else task.doDate = this.today`, add:

```ts
const inDays = lower.match(/\bin\s+(\d+)\s+days?\b/);
const inWeeks = lower.match(/\bin\s+(\d+)\s+weeks?\b/);
const nextWeek = /\bnext week\b|\bin a week\b/.test(lower);
```

and branch:

```ts
if (/\bsomeday\b|\bone day\b/.test(lower)) task.doDate = null;
else if (/\btomorrow\b/.test(lower)) task.doDate = addDays(this.today, 1);
else if (inDays) task.doDate = addDays(this.today, Number(inDays[1]));
else if (inWeeks) task.doDate = addDays(this.today, 7 * Number(inWeeks[1]));
else if (nextWeek) task.doDate = addDays(this.today, 7);
else { /* existing weekday / default-today logic */ }
```

Extend `cleanTitle` to strip the offset phrases:

```ts
.replace(/\bin\s+\d+\s+(days?|weeks?)\b/gi, "")
.replace(/\b(next week|in a week)\b/gi, "")
```

`parseCases.ts` — add the golden case:

```ts
{ input: "grab delivery in 5 days", expect: (t, today) => t.doDate === addDays(today, 5) && !t.needsDate },
```

> Match the existing `parseCases.ts` case shape exactly (read the file); if it stores an expected literal, compute `today+5` for the fixture's canonical `today`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/ai/fakeParser.test.ts src/lib/ai/organizeClient.test.ts src/app/api/organize && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/organizeClient.ts src/app/api/organize/route.ts src/lib/ai/prompt.ts src/lib/ai/fakeParser.ts src/lib/ai/fixtures/parseCases.ts src/lib/ai/fakeParser.test.ts src/lib/ai/organizeClient.test.ts
git commit -m "feat(ai): resolve dates against client today + relative offsets (in N days/weeks)"
```

---

## Task 5: `useGatedOrganize()` + empty-parse

**Files:**
- Create: `src/lib/ai/useGatedOrganize.ts`
- Create: `src/components/billing/LimitReachedSheet.tsx` already exists — reuse it.
- Modify: `src/components/screens/CaptureFlow.tsx` (consume the hook; add the empty notice)
- Test: `src/lib/ai/useGatedOrganize.test.tsx`, `src/components/screens/CaptureFlow.test.tsx` (empty-parse case)

**Interfaces:**
- Consumes: `useAuth` (`profile`, `isPro`), `LocalUsageService`/`USAGE_KEY`, `profileKey`, `todayISO`, `usePersistentState`, `useIsHydrated`, `organize`.
- Produces: `useGatedOrganize()` → `{ run(text: string): Promise<{ status: "ok"; tasks: ParsedTask[] } | { status: "blocked" } | { status: "empty" } | { status: "error"; message: string }>, limitOpen, closeLimit, used, limit }`. `run`: if `!isPro && remaining ≤ 0` → open limit sheet, return `blocked` (no parse); else `organize(text)`, cache `freeDailyInputs`; on success non-Pro `increment` + update `used`; `tasks.length === 0` → `empty`; else `ok`. Errors → `error`.

- [ ] **Step 1: Write the failing hook test**

```tsx
// src/lib/ai/useGatedOrganize.test.tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { LocalAuthService } from "@/lib/auth/LocalAuthService";
import { profileKey } from "@/lib/profile/profileKey";
import { USAGE_KEY } from "@/lib/usage/LocalUsageService";
import { todayISO } from "@/lib/date/clock";
import { useGatedOrganize } from "./useGatedOrganize";
import * as client from "./organizeClient";

function wrap(service: LocalAuthService) {
  return ({ children }: { children: React.ReactNode }) => <AuthProvider service={service}>{children}</AuthProvider>;
}

describe("useGatedOrganize", () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  it("blocks (no parse) when a non-Pro user is out of inputs", async () => {
    const service = new LocalAuthService();
    const guest = service.startGuest();
    localStorage.setItem(profileKey(USAGE_KEY, guest.id), JSON.stringify({ date: todayISO(), count: 3 }));
    const spy = vi.spyOn(client, "organize");
    const { result } = renderHook(() => useGatedOrganize(), { wrapper: wrap(service) });
    let out: unknown;
    await act(async () => { out = await result.current.run("something"); });
    expect(out).toEqual({ status: "blocked" });
    expect(spy).not.toHaveBeenCalled();
    expect(result.current.limitOpen).toBe(true);
  });

  it("returns empty on a 0-task parse and still counts the input", async () => {
    const service = new LocalAuthService();
    const guest = service.startGuest();
    vi.spyOn(client, "organize").mockResolvedValue({ tasks: [], degraded: false, freeDailyInputs: 3 });
    const { result } = renderHook(() => useGatedOrganize(), { wrapper: wrap(service) });
    let out: unknown;
    await act(async () => { out = await result.current.run("gibberish"); });
    expect(out).toEqual({ status: "empty" });
    expect(JSON.parse(localStorage.getItem(profileKey(USAGE_KEY, guest.id))!).count).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/ai/useGatedOrganize.test.tsx`
Expected: FAIL — `Cannot find module './useGatedOrganize'`.

- [ ] **Step 3: Write the hook (lift the logic out of CaptureFlow)**

```tsx
// src/lib/ai/useGatedOrganize.ts
"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { LocalUsageService, USAGE_KEY } from "@/lib/usage/LocalUsageService";
import { profileKey } from "@/lib/profile/profileKey";
import { todayISO } from "@/lib/date/clock";
import { usePersistentState } from "@/lib/preferences/usePersistentState";
import { useIsHydrated } from "@/lib/hooks/useIsHydrated";
import { organize } from "./organizeClient";
import type { ParsedTask } from "@/lib/task/types";

export type OrganizeOutcome =
  | { status: "ok"; tasks: ParsedTask[]; degraded: boolean }
  | { status: "blocked" }
  | { status: "empty" }
  | { status: "error"; message: string };

export function useGatedOrganize() {
  const { profile, isPro } = useAuth();
  const today = todayISO();
  const usage = useMemo(
    () => new LocalUsageService(profileKey(USAGE_KEY, profile?.id ?? "guest")),
    [profile?.id],
  );
  const [limit, setLimit] = usePersistentState<number>("freeDailyInputs", 3);
  const isHydrated = useIsHydrated();
  const [used, setUsed] = useState(0);
  const [usedHydrated, setUsedHydrated] = useState(false);
  if (isHydrated && !usedHydrated) {
    setUsedHydrated(true);
    setUsed(usage.count(today));
  }
  const [limitOpen, setLimitOpen] = useState(false);

  async function run(text: string): Promise<OrganizeOutcome> {
    if (!isPro && usage.remaining(today, limit) <= 0) {
      setUsed(usage.count(today));
      setLimitOpen(true);
      return { status: "blocked" };
    }
    try {
      const { tasks, degraded, freeDailyInputs } = await organize(text);
      setLimit(freeDailyInputs);
      if (!isPro) {
        usage.increment(today);
        setUsed(usage.count(today));
      }
      if (tasks.length === 0) return { status: "empty" };
      return { status: "ok", tasks, degraded };
    } catch (e) {
      return { status: "error", message: (e as Error).message };
    }
  }

  return { run, limitOpen, closeLimit: () => setLimitOpen(false), used, limit, isPro };
}
```

- [ ] **Step 4: Refactor `CaptureFlow` to use the hook + add the empty notice**

Replace CaptureFlow's inline `usage`/`limit`/`used`/`limitOpen`/gate logic (from Task 1's `isHydrated`/`used` block through `planIt`) with `const { run, limitOpen, closeLimit, used, limit, isPro } = useGatedOrganize();` and:

```tsx
async function planIt() {
  const out = await run(text);
  if (out.status === "blocked") return;
  if (out.status === "empty") { setNotice("I couldn't find any tasks in that — try rephrasing."); return; }
  if (out.status === "error") { setError(out.message); return; }
  markOrganized();
  setDegraded(out.degraded);
  setProposal(out.tasks);
}
```

Add `const [notice, setNotice] = useState<string | null>(null);` and render `{notice && <p className="text-[13px] text-text-secondary">{notice}</p>}` near the existing error line; clear `notice`/`error` at the top of `planIt`. Keep `setBusy` around `run`. Render `<LimitReachedSheet open={limitOpen} onClose={closeLimit} used={used} limit={limit} />` and the `{!isPro && ...}` "N left today" line using `used`/`limit` from the hook. (The `usedToday` inline read is removed — display uses `used`.)

- [ ] **Step 5: Add the CaptureFlow empty-parse test**

```tsx
// add to src/components/screens/CaptureFlow.test.tsx (uses the existing renderCapture helper + organize mock)
it("shows an inline notice and stays on the composer when the parse finds no tasks", async () => {
  localStorage.clear();
  vi.mocked(organize).mockResolvedValue({ tasks: [], degraded: false, freeDailyInputs: 3 });
  renderCapture();
  await userEvent.type(screen.getByLabelText(/brain dump/i), "asdfghjkl");
  await userEvent.click(screen.getByRole("button", { name: /plan it/i }));
  expect(await screen.findByText(/couldn't find any tasks/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/brain dump/i)).toHaveValue("asdfghjkl"); // dump kept
});
```

- [ ] **Step 6: Run suites + typecheck + lint**

Run: `npm test -- src/lib/ai/useGatedOrganize.test.tsx src/components/screens/CaptureFlow.test.tsx && npm run typecheck && npm run lint`
Expected: PASS (existing CaptureFlow metering tests still green — behavior preserved; new empty-parse case; hook tests).

- [ ] **Step 7: Commit**

```bash
git add src/lib/ai/useGatedOrganize.ts src/lib/ai/useGatedOrganize.test.tsx src/components/screens/CaptureFlow.tsx src/components/screens/CaptureFlow.test.tsx
git commit -m "feat(ai): shared useGatedOrganize hook + empty-parse notice; refactor Capture"
```

---

## Task 6: Capture chip-hide + input padding

**Files:**
- Modify: `src/components/screens/CaptureFlow.tsx`
- Test: `src/components/screens/CaptureFlow.test.tsx` (add cases)

**Interfaces:**
- Consumes: `useTasks` (`tasks`).
- Produces: the "Try an example" chip shows only when `firstRun && tasks.length === 0`; when the chip is absent the textarea's top spacing is tighter.

- [ ] **Step 1: Write the failing test**

```tsx
// add to src/components/screens/CaptureFlow.test.tsx
it("hides the example chip once any task exists (even without organizing)", () => {
  localStorage.clear();
  const service = new LocalAuthService();
  service.startGuest();
  const store = new MemoryTaskStore();
  render(
    <AuthProvider service={service}>
      <SaveNudgeProvider>
        <TaskStoreProvider store={store}>
          <SeedOneTask />
          <CaptureFlow />
        </TaskStoreProvider>
      </SaveNudgeProvider>
    </AuthProvider>,
  );
  expect(screen.queryByRole("button", { name: /try an example/i })).not.toBeInTheDocument();
});
```

> `SeedOneTask` is a tiny helper component that calls `useTasks().addTask({ title: "x" })` once on mount (via a ref-guard, not an effect-setState) — or seed the MemoryTaskStore with one task before render and rely on hydration. Use whichever fits the existing test helpers; the assertion is what matters.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/screens/CaptureFlow.test.tsx`
Expected: FAIL — the chip still renders when tasks exist (gated only on `firstRun`).

- [ ] **Step 3: Implement**

In `CaptureFlow.tsx`: pull `tasks` from the existing `useTasks()` (it already uses `addTasks`; add `tasks`). Change the chip gate:

```tsx
const showExampleChip = firstRun && tasks.length === 0;
```

Gate the chip block on `showExampleChip` (replace the current `firstRun &&`). When the chip is hidden, reduce the textarea's top margin — make the textarea's top spacing conditional, e.g. change its `className` so the `mt-1` (or whatever the leading gap is) is only applied when `showExampleChip` is true:

```tsx
className={`${showExampleChip ? "mt-1" : "mt-0"} min-h-44 flex-1 resize-none ...`}
```

(Keep the existing classes; only the leading margin toggles. Verify the current class string in the file and adjust the top-spacing token so text sits closer to the top when the chip is gone.)

- [ ] **Step 4: Run tests + lint**

Run: `npm test -- src/components/screens/CaptureFlow.test.tsx && npm run lint`
Expected: PASS (new case + existing first-run chip cases still green — a fresh guest with no tasks still shows the chip).

- [ ] **Step 5: Commit**

```bash
git add src/components/screens/CaptureFlow.tsx src/components/screens/CaptureFlow.test.tsx
git commit -m "feat(capture): hide example chip once tasks exist + tighten input spacing"
```

---

## Task 7: Review roll-ups A — Plans + waitlist

**Files:**
- Modify: `src/components/screens/PlansScreen.tsx` (Downgrade padding)
- Modify: `src/components/screens/PlansScreen.test.tsx` (pre-guest case)
- Modify: `src/components/capture/VoiceComingSoonSheet.tsx` (email `@`-guard)
- Modify: `src/components/capture/VoiceComingSoonSheet.test.tsx` (name-only case)

**Interfaces:** consumes existing components; no new exports.

- [ ] **Step 1: Write the failing tests**

```tsx
// add to src/components/screens/PlansScreen.test.tsx
it("shows a Get started link (no upgrade) for a pre-guest with no profile", () => {
  const service = new LocalAuthService(); // never startGuest → current() null
  renderPlans(service);
  expect(screen.getByRole("link", { name: /get started/i })).toHaveAttribute("href", "/welcome");
  expect(screen.queryByRole("button", { name: /upgrade to pro/i })).not.toBeInTheDocument();
});
```

```tsx
// add to src/components/capture/VoiceComingSoonSheet.test.tsx
it("does not join with a malformed email", async () => {
  const auth = new LocalAuthService(); auth.startGuest();
  renderSheet(auth);
  await userEvent.type(screen.getByLabelText(/email/i), "notanemail");
  await userEvent.click(screen.getByRole("button", { name: /notify me/i }));
  expect(screen.queryByText(/you.re on the list/i)).not.toBeInTheDocument(); // stayed on the form
});
it("one-taps a name-only signed-in user via the email field (no known email)", async () => {
  const auth = new LocalAuthService(); auth.startGuest();
  auth.signIn({ emailOrName: "Sam" }); // name only → no email
  renderSheet(auth);
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument(); // falls to the email field
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/screens/PlansScreen.test.tsx src/components/capture/VoiceComingSoonSheet.test.tsx`
Expected: FAIL — pre-guest link untested/absent assertion; malformed email currently joins.

- [ ] **Step 3: Implement**

- `PlansScreen.tsx`: give the Downgrade button `className="min-h-11 rounded-full px-4 text-[15px] text-text-secondary"` (add `px-4`; keep it text-styled). Confirm the pre-guest branch already renders the `/welcome` "Get started" link (from M2 Task 6) — if so the test passes on the existing code; if the link text differs, align the test to the real text.
- `VoiceComingSoonSheet.tsx`: in `submit`, guard: `const v = value.trim(); if (!/.+@.+/.test(v)) return;` before `waitlist.join(...)`. (The known-email one-tap path always has a valid email; the guard only blocks the manual field.)

- [ ] **Step 4: Run tests + typecheck**

Run: `npm test -- src/components/screens/PlansScreen.test.tsx src/components/capture/VoiceComingSoonSheet.test.tsx && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/screens/PlansScreen.tsx src/components/screens/PlansScreen.test.tsx src/components/capture/VoiceComingSoonSheet.tsx src/components/capture/VoiceComingSoonSheet.test.tsx
git commit -m "fix(ui): PlansScreen pre-guest test + Downgrade padding; waitlist email guard + name-only test"
```

---

## Task 8: Review roll-ups B — a11y + schema guard

**Files:**
- Modify: `src/components/task/TaskEditorSheet.tsx` (`aria-modal` + initial focus + Escape)
- Modify: `src/components/task/TaskRow.tsx` (open-control `aria-label`)
- Modify: `src/lib/ai/schema.ts` (compile-time `satisfies` guard)
- Test: `src/components/task/TaskEditorSheet.test.tsx`, `src/components/task/TaskRow.test.tsx` (assertions)

**Interfaces:** no new exports; a compile-time type check in `schema.ts`.

- [ ] **Step 1: Write the failing tests**

```tsx
// add to src/components/task/TaskEditorSheet.test.tsx
it("marks the dialog as modal", () => {
  render(<TaskEditorSheet open initial={{ title: "T" }} onClose={vi.fn()} onSave={vi.fn()} />);
  expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
});
```

```tsx
// add to src/components/task/TaskRow.test.tsx
it("gives the open control an explicit accessible name", () => {
  render(<TaskRow task={task} today={TODAY} onToggle={vi.fn()} onOpen={vi.fn()} onMove={vi.fn()} moveTarget="inbox" />);
  expect(screen.getByRole("button", { name: /open finish the pitch deck/i })).toBeInTheDocument();
});
```

> Use the existing `task` fixture/title in `TaskRow.test.tsx`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/task/TaskEditorSheet.test.tsx src/components/task/TaskRow.test.tsx`
Expected: FAIL — no `aria-modal`; open control has no explicit name.

- [ ] **Step 3: Implement**

- `TaskEditorSheet.tsx`: add `aria-modal="true"` to the dialog root; on open, focus the title input (a `ref` + a during-render/`autoFocus` approach consistent with the file — `autoFocus` on the title input is simplest); add an Escape `keydown` handler that calls `onClose` (mirror `BottomSheet`'s pattern). No layout change.
- `TaskRow.tsx`: give the title/open button (the element wired to `onOpen`) `aria-label={`Open ${task.title}`}`, and mark the decorative meta (flag/time/chips) `aria-hidden` where they're inside the open control so the accessible name is just the label.
- `schema.ts`: append `import type { ParsedTask } from "@/lib/task/types";` and `type _SchemaMatchesType = z.infer<typeof modelTaskSchema> satisfies Record<keyof Omit<ParsedTask, "needsDate">, unknown>;` — or the simplest form that fails typecheck if a schema key drifts from `ParsedTask`. (Keep it a `type`-only guard; no runtime code.)

- [ ] **Step 4: Run tests + typecheck**

Run: `npm test -- src/components/task/TaskEditorSheet.test.tsx src/components/task/TaskRow.test.tsx && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/task/TaskEditorSheet.tsx src/components/task/TaskRow.tsx src/lib/ai/schema.ts src/components/task/TaskEditorSheet.test.tsx src/components/task/TaskRow.test.tsx
git commit -m "fix(a11y): editor aria-modal+focus, TaskRow open aria-label; schema drift guard"
```

---

# C2 — Needs-a-date

## Task 9: `needsDate` — schema + prompt + fake parser

**Files:**
- Modify: `src/lib/ai/schema.ts` (add `needsDate` to both schemas)
- Modify: `src/lib/ai/prompt.ts` (needsDate instruction)
- Modify: `src/lib/ai/fakeParser.ts` (detect unresolved timing → `needsDate`)
- Modify: `src/lib/ai/fixtures/parseCases.ts` (golden case)
- Test: `src/lib/ai/fakeParser.test.ts`

**Interfaces:**
- Produces: `parsedTaskSchema`/`modelTaskSchema` accept `needsDate` (nullish/nullable boolean); `FakeTaskParser` sets `needsDate: true` on unresolved-timing clauses with `doDate === null`.

- [ ] **Step 1: Write the failing test**

```ts
// add to src/lib/ai/fakeParser.test.ts
it("flags vague unresolved timing as needsDate with null doDate", async () => {
  const [t] = await new FakeTaskParser({ today: "2026-07-20" }).parse("call the vet at some point");
  expect(t.doDate).toBeNull();
  expect(t.needsDate).toBe(true);
});
it("does NOT flag explicit someday as needsDate", async () => {
  const [t] = await new FakeTaskParser({ today: "2026-07-20" }).parse("someday read that design book");
  expect(t.doDate).toBeNull();
  expect(t.needsDate).toBeFalsy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/ai/fakeParser.test.ts`
Expected: FAIL — no `needsDate` set; "at some point" currently routes to today.

- [ ] **Step 3: Implement**

- `schema.ts`: add `needsDate: z.boolean().nullish(),` to `parsedTaskSchema` and `needsDate: z.boolean().nullable(),` to `modelTaskSchema`. (Update the Task-8 `satisfies` guard to include `needsDate`.)
- `prompt.ts`: add a bullet:

```ts
"- needsDate: true ONLY when the input expresses timing you can't resolve to a concrete date",
"  ('soon', 'later', 'at some point', 'sometime'). Then leave doDate null. Explicit 'someday' is NOT needsDate.",
```

- `fakeParser.ts`: add a vague-timing detector in `parseClause`. Define `const vague = /\b(later|soon|sometime|at some point|some day soon)\b/.test(lower)` (note: keep `someday`/`one day` as the existing plain-backlog branch, distinct from `some day soon`). In the routing branch, **before** the default `else task.doDate = this.today`, add: `else if (vague) { task.doDate = null; task.needsDate = true; }`. Ensure `someday`/`one day` still hits its own null branch first (no needsDate). Strip vague phrases in `cleanTitle`.

- `parseCases.ts`: add `{ input: "call the vet at some point", expect: (t) => t.doDate === null && t.needsDate === true }`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/ai/fakeParser.test.ts src/lib/ai/schema.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/schema.ts src/lib/ai/prompt.ts src/lib/ai/fakeParser.ts src/lib/ai/fixtures/parseCases.ts src/lib/ai/fakeParser.test.ts
git commit -m "feat(ai): needsDate — AI flag + fake-parser detection of unresolved timing"
```

---

## Task 10: `groupInbox` 3-way + Inbox "Needs a date" section

**Files:**
- Modify: `src/lib/task/ordering.ts` (`groupInbox` returns `needsDate`)
- Modify: `src/components/screens/InboxScreen.tsx` (render the section)
- Test: `src/lib/task/ordering.test.ts`, `src/components/screens/InboxScreen.test.tsx`

**Interfaces:**
- Produces: `groupInbox(tasks, today)` → `{ needsDate: Task[]; scheduled: Task[]; someday: Task[] }` where `needsDate` = `doDate === null && task.needsDate === true`, `someday` = `doDate === null && !task.needsDate`.

- [ ] **Step 1: Write the failing tests**

```ts
// add to src/lib/task/ordering.test.ts
it("splits needs-a-date out of someday", () => {
  const nd = t({ doDate: null, needsDate: true });
  const someday = t({ doDate: null });
  const g = groupInbox([someday, nd], TODAY);
  expect(g.needsDate.map((x) => x.id)).toEqual([nd.id]);
  expect(g.someday.map((x) => x.id)).toEqual([someday.id]);
});
```

```tsx
// add to src/components/screens/InboxScreen.test.tsx — render a needsDate task, assert the section header
it("renders the Needs a date section", () => {
  // seed a store with one needsDate task, render InboxScreen within its providers
  expect(screen.getByText(/needs a date · 1/i)).toBeInTheDocument();
});
```

> Follow the existing `InboxScreen.test.tsx` render harness (AuthProvider + SaveNudgeProvider + TaskStoreProvider) and its task-seeding pattern.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/task/ordering.test.ts src/components/screens/InboxScreen.test.tsx`
Expected: FAIL — `groupInbox` has no `needsDate`; no section.

- [ ] **Step 3: Implement**

`ordering.ts`:

```ts
export function groupInbox(tasks: Task[], today: string) {
  const scheduled = tasks
    .filter((t) => t.doDate !== null && t.doDate > today)
    .sort((a, b) => (a.doDate! < b.doDate! ? -1 : a.doDate! > b.doDate! ? 1 : a.order - b.order));
  const undated = tasks.filter((t) => t.doDate === null);
  const needsDate = undated.filter((t) => t.needsDate === true).sort((a, b) => a.order - b.order);
  const someday = undated.filter((t) => t.needsDate !== true).sort((a, b) => a.order - b.order);
  return { needsDate, scheduled, someday };
}
```

`InboxScreen.tsx`: destructure `needsDate` and render it as the **top** section (above Scheduled), same `TaskRow` mapping, header `Needs a date · {needsDate.length}` with a short hint line ("Tap to set a date."). Tapping a row opens the editor (existing `onOpen`/`setEditing`). Keep Scheduled/Someday below.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/task/ordering.test.ts src/components/screens/InboxScreen.test.tsx && npm run typecheck`
Expected: PASS (existing Inbox tests still green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/task/ordering.ts src/components/screens/InboxScreen.tsx src/lib/task/ordering.test.ts src/components/screens/InboxScreen.test.tsx
git commit -m "feat(inbox): Needs a date section (groupInbox 3-way + resolve via editor)"
```

---

# C3 — Quick-add AI

## Task 11: `QuickAddSheet`

**Files:**
- Create: `src/components/task/QuickAddSheet.tsx`
- Test: `src/components/task/QuickAddSheet.test.tsx`

**Interfaces:**
- Consumes: `BottomSheet`, `useGatedOrganize` (Task 5), `LimitReachedSheet`, `TaskEditorSheet`, `ReviewScreen`, `useTasks` (`addTask`, `addTasks`), `TaskDraft`/`ParsedTask`.
- Produces: `QuickAddSheet` props `{ open: boolean; onClose(): void; defaultDoDate: string | null }`. Modes: **Parse with AI** → `run(text)` → `blocked` (limit sheet) / `empty` (inline notice) / 1 task → prefilled `TaskEditorSheet` (`onSave` = `addTask` → close) / several → `ReviewScreen` overlay (`onCommit` = `addTasks` → close). **Enter manually** → blank `TaskEditorSheet` (`initial.doDate = defaultDoDate`). All within the sheet/overlay; no navigation.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/task/QuickAddSheet.test.tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { LocalAuthService } from "@/lib/auth/LocalAuthService";
import { TaskStoreProvider, MemoryTaskStore } from "@/lib/tasks/TaskStoreProvider";
import { QuickAddSheet } from "./QuickAddSheet";
import * as client from "@/lib/ai/organizeClient";

function renderSheet(onClose = vi.fn(), defaultDoDate: string | null = null) {
  const service = new LocalAuthService(); service.startGuest();
  return render(
    <AuthProvider service={service}>
      <TaskStoreProvider store={new MemoryTaskStore()}>
        <QuickAddSheet open onClose={onClose} defaultDoDate={defaultDoDate} />
      </TaskStoreProvider>
    </AuthProvider>,
  );
}

describe("QuickAddSheet", () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  it("Enter manually opens a blank editor", async () => {
    renderSheet();
    await userEvent.click(screen.getByRole("button", { name: /enter manually/i }));
    expect(screen.getByRole("dialog", { name: /new task/i })).toBeInTheDocument();
  });

  it("Parse with AI on a single task opens the prefilled editor", async () => {
    vi.spyOn(client, "organize").mockResolvedValue({
      tasks: [{ title: "Book dentist", doDate: null, priority: "none", tags: [] }],
      degraded: false, freeDailyInputs: 3,
    });
    renderSheet();
    await userEvent.type(screen.getByLabelText(/new task/i), "book dentist");
    await userEvent.click(screen.getByRole("button", { name: /parse with ai/i }));
    expect(await screen.findByDisplayValue(/book dentist/i)).toBeInTheDocument(); // editor prefilled
  });

  it("Parse with AI on several tasks opens Review", async () => {
    vi.spyOn(client, "organize").mockResolvedValue({
      tasks: [{ title: "A", doDate: null, priority: "none", tags: [] }, { title: "B", doDate: null, priority: "none", tags: [] }],
      degraded: false, freeDailyInputs: 3,
    });
    renderSheet();
    await userEvent.type(screen.getByLabelText(/new task/i), "a and b");
    await userEvent.click(screen.getByRole("button", { name: /parse with ai/i }));
    expect(await screen.findByRole("button", { name: /add 2 tasks/i })).toBeInTheDocument();
  });
});
```

> The free-text field's accessible name is "New task" (`aria-label="New task"`). Match the editor's `aria-label`/title ("New task") and `ReviewScreen`'s commit button ("Add N tasks") to the real components.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/task/QuickAddSheet.test.tsx`
Expected: FAIL — `Cannot find module './QuickAddSheet'`.

- [ ] **Step 3: Write the sheet**

```tsx
// src/components/task/QuickAddSheet.tsx
"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { LimitReachedSheet } from "@/components/billing/LimitReachedSheet";
import { TaskEditorSheet } from "./TaskEditorSheet";
import { ReviewScreen } from "@/components/screens/ReviewScreen";
import { useGatedOrganize } from "@/lib/ai/useGatedOrganize";
import { useTasks } from "@/lib/tasks/useTasks";
import type { ParsedTask, TaskDraft } from "@/lib/task/types";

type Stage =
  | { kind: "input" }
  | { kind: "editor"; initial: TaskDraft }
  | { kind: "review"; proposal: ParsedTask[] };

export function QuickAddSheet({ open, onClose, defaultDoDate }: { open: boolean; onClose(): void; defaultDoDate: string | null }) {
  const { addTask, addTasks } = useTasks();
  const { run, limitOpen, closeLimit, used, limit } = useGatedOrganize();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>({ kind: "input" });

  const done = () => { setText(""); setNotice(null); setStage({ kind: "input" }); onClose(); };

  async function parse() {
    setBusy(true); setNotice(null);
    const out = await run(text);
    setBusy(false);
    if (out.status === "blocked") return;
    if (out.status === "empty") { setNotice("I couldn't find any tasks in that — try rephrasing."); return; }
    if (out.status === "error") { setNotice(out.message); return; }
    if (out.tasks.length === 1) setStage({ kind: "editor", initial: out.tasks[0] as TaskDraft });
    else setStage({ kind: "review", proposal: out.tasks });
  }

  if (stage.kind === "editor") {
    return (
      <TaskEditorSheet
        open
        title="New task"
        initial={stage.initial}
        onClose={done}
        onSave={(draft) => { addTask(draft); done(); }}
      />
    );
  }
  if (stage.kind === "review") {
    return (
      <ReviewScreen
        proposal={stage.proposal}
        onCommit={(tasks) => { addTasks(tasks); done(); }}
        onStartOver={() => setStage({ kind: "input" })}
      />
    );
  }

  return (
    <>
      <BottomSheet open={open} onClose={done} ariaLabel="New task">
        <h2 className="text-lg font-medium">New task</h2>
        <p className="mt-0.5 text-[13px] text-text-secondary">One task opens the editor · several open Review.</p>
        <textarea
          aria-label="New task"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What needs doing? I'll sort the date, time, priority…"
          className="mt-3 min-h-24 w-full resize-none rounded-lg border border-border bg-surface-2 p-3 text-base outline-none"
        />
        {notice && <p className="mt-1 text-[13px] text-text-secondary">{notice}</p>}
        <div className="mt-3 flex items-center justify-between">
          <button type="button" onClick={() => setStage({ kind: "editor", initial: { title: "", doDate: defaultDoDate, tags: [] } })}
            className="min-h-11 text-[15px] text-text-secondary">
            Enter manually
          </button>
          <button type="button" onClick={parse} disabled={busy || !text.trim()}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-fill-accent px-4 text-[15px] font-medium text-on-accent disabled:opacity-50">
            {busy ? "Parsing…" : "Parse with AI"}
          </button>
        </div>
      </BottomSheet>
      <LimitReachedSheet open={limitOpen} onClose={closeLimit} used={used} limit={limit} />
    </>
  );
}
```

- [ ] **Step 4: Run test + typecheck + lint**

Run: `npm test -- src/components/task/QuickAddSheet.test.tsx && npm run typecheck && npm run lint`
Expected: PASS (3 cases).

- [ ] **Step 5: Commit**

```bash
git add src/components/task/QuickAddSheet.tsx src/components/task/QuickAddSheet.test.tsx
git commit -m "feat(quick-add): QuickAddSheet — Parse with AI / Enter manually (editor|Review)"
```

---

## Task 12: Wire quick-add into Today + Inbox

**Files:**
- Modify: `src/components/screens/TodayScreen.tsx`, `src/components/screens/InboxScreen.tsx`
- Test: `src/components/screens/TodayScreen.test.tsx` (opens the sheet)

**Interfaces:**
- Produces: `+ Add task` opens `QuickAddSheet` (with `defaultDoDate` = `today` on Today, `null` on Inbox) instead of the editor directly.

- [ ] **Step 1: Write the failing test**

```tsx
// add to src/components/screens/TodayScreen.test.tsx
it("+ Add task opens the quick-add sheet", async () => {
  // render TodayScreen within its providers (seed nothing)
  await userEvent.click(screen.getByRole("button", { name: /add task/i }));
  expect(screen.getByRole("dialog", { name: /new task/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /parse with ai/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/screens/TodayScreen.test.tsx`
Expected: FAIL — `+ Add task` currently opens the editor directly (no "Parse with AI").

- [ ] **Step 3: Implement**

In `TodayScreen.tsx` and `InboxScreen.tsx`: add `const [quickAdd, setQuickAdd] = useState(false);`, change the `+ Add task` button to `onClick={() => setQuickAdd(true)}`, and render `{quickAdd && <QuickAddSheet open onClose={() => setQuickAdd(false)} defaultDoDate={today} />}` (Today) / `defaultDoDate={null}` (Inbox). Remove the old `setEditing("new")` path for `+ Add task` (the editor is still used for editing existing rows and is now reached via QuickAdd's "Enter manually"). Keep the existing edit-existing-task flow intact.

> Verify the current `+ Add task` handler and the `editing` state usage; only the *new-task* entry changes to QuickAdd. Editing an existing row still opens `TaskEditorSheet` directly.

- [ ] **Step 4: Run tests + typecheck**

Run: `npm test -- src/components/screens/TodayScreen.test.tsx src/components/screens/InboxScreen.test.tsx && npm run typecheck`
Expected: PASS (existing screen tests green; new-task now routes through QuickAdd).

- [ ] **Step 5: Commit**

```bash
git add src/components/screens/TodayScreen.tsx src/components/screens/InboxScreen.tsx src/components/screens/TodayScreen.test.tsx
git commit -m "feat(quick-add): + Add task opens QuickAddSheet on Today/Inbox"
```

---

# C4 — Pull-from-Inbox

## Task 13: Today empty-state "pull from Inbox" link

**Files:**
- Modify: `src/components/screens/TodayScreen.tsx`
- Test: `src/components/screens/TodayScreen.test.tsx`

**Interfaces:**
- Produces: when Today is empty and the Inbox has active items, "pull from Inbox" is a `Link` to `/inbox`; when the Inbox is empty, the copy has no link.

- [ ] **Step 1: Write the failing test**

```tsx
// add to src/components/screens/TodayScreen.test.tsx
it("shows a pull-from-Inbox link when Today is empty and Inbox has items", () => {
  // seed one active Inbox task (doDate null/future), none for today; render TodayScreen
  expect(screen.getByRole("link", { name: /pull from inbox/i })).toHaveAttribute("href", "/inbox");
});
it("shows no link when both are empty", () => {
  // seed nothing; render TodayScreen
  expect(screen.queryByRole("link", { name: /pull from inbox/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/screens/TodayScreen.test.tsx`
Expected: FAIL — "pull from Inbox" is plain text, not a link.

- [ ] **Step 3: Implement**

In `TodayScreen.tsx`'s empty state, replace the `{hasInbox ? " or pull from Inbox" : ""}` text with a conditional link (keep §10 copy exact):

```tsx
<p className="mt-10 text-center text-text-secondary">
  Nothing planned — capture your thoughts
  {hasInbox && (
    <> or <Link href="/inbox" className="text-text-accent underline">pull from Inbox</Link></>
  )}
</p>
```

(Add `import Link from "next/link";`.)

- [ ] **Step 4: Run tests + typecheck**

Run: `npm test -- src/components/screens/TodayScreen.test.tsx && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/screens/TodayScreen.tsx src/components/screens/TodayScreen.test.tsx
git commit -m "feat(today): pull-from-Inbox empty-state link"
```

---

# Finish

## Task 14: e2e (needs-a-date + quick-add) + full sweep + PROGRESS

**Files:**
- Create: `e2e/milestone-c.spec.ts`
- Modify: `docs/PROGRESS.md`

- [ ] **Step 1: Write the e2e**

```ts
// e2e/milestone-c.spec.ts
import { test, expect } from "@playwright/test";

test("quick-add a single task via AI from Today", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /get started/i }).click();
  await page.goto("/today");
  await page.getByRole("button", { name: /add task/i }).click();
  await expect(page.getByRole("button", { name: /parse with ai/i })).toBeVisible();
  await page.getByLabel(/new task/i).fill("book dentist tomorrow");
  await page.getByRole("button", { name: /parse with ai/i }).click();
  // Single task → editor prefilled; save it.
  await expect(page.getByDisplayValue(/book dentist/i)).toBeVisible();
  await page.getByRole("button", { name: /^done$/i }).click();
});

test("an unresolved-timing dump lands in Needs a date", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /get started/i }).click();
  await page.getByRole("button", { name: /try an example|plan it/i }); // ensure on capture
  await page.getByLabel(/brain dump/i).fill("call the vet at some point");
  await page.getByRole("button", { name: /plan it/i }).click();
  await page.getByRole("button", { name: /add \d+ tasks?/i }).click();
  await page.goto("/inbox");
  await expect(page.getByText(/needs a date/i)).toBeVisible();
});
```

> Verify selectors against the shipped components (the Done button label in `TaskEditorSheet`, the Capture textarea label). Adjust to the real accessible names; keep the assertions.

- [ ] **Step 2: Run the e2e**

Run: `npm run test:e2e -- milestone-c`
Expected: PASS. If the local `.next` lock blocks it, verify via `BASE_URL=http://localhost:3000 npx playwright test milestone-c` against a running dev server, else rely on CI.

- [ ] **Step 3: Full sweep**

Run: `npm run lint && npm run typecheck && npm test && npm run test:e2e`
Expected: all green. Record the unit count (from 230 + Milestone C additions).

- [ ] **Step 4: Update PROGRESS**

Add a Milestone C "Done" entry to `docs/PROGRESS.md` (needs-a-date, quick-add AI, robustness, cleanups; unit/e2e counts) and move the parked "in 5 days" item to Done.

- [ ] **Step 5: Commit**

```bash
git add e2e/milestone-c.spec.ts docs/PROGRESS.md
git commit -m "test(e2e): quick-add + needs-a-date flows; Milestone C sweep; PROGRESS"
```

---

## Self-Review (completed while writing — notes for the implementer)

- **Spec coverage.** C1: empty-parse (T5), client-tz+offsets (T4), deadline 3-tier (T3), Welcome guard (T2), Capture chip/padding (T6), `useIsHydrated` (T1), roll-ups (T7/T8). C2: needsDate flag+detect (T9), Inbox section (T10). C3: `useGatedOrganize`+QuickAddSheet (T5/T11), wiring (T12). C4: pull-from-Inbox (T13). Finish: e2e+sweep (T14).
- **Type consistency.** `useIsHydrated(): boolean` (T1) used by `RequireProfile` (T2) and `useGatedOrganize` (T5). `useGatedOrganize().run` returns the `{status}` union consumed verbatim by CaptureFlow (T5) and QuickAddSheet (T11). `groupInbox` → `{ needsDate, scheduled, someday }` (T10) matches InboxScreen's destructure. `needsDate` schema/type/parser aligned (T9) and guarded (T8). `QuickAddSheet` props `{ open, onClose, defaultDoDate }` used by Today/Inbox (T12).
- **Ordering.** `useIsHydrated` (T1) precedes its consumers (T2, T5). `useGatedOrganize` (T5) precedes `QuickAddSheet` (T11). Empty-parse lands once in the hook (T5), reused by QuickAdd (T11) — no double implementation. The Task-8 schema guard is updated when `needsDate` is added to the schema (T9) — note in T9 Step 3.
- **Behavior-preserving refactors flagged.** T1 (`useIsHydrated`) and T5 (`useGatedOrganize`) move shipped logic; the existing CaptureFlow/provider tests are the safety net and must stay green — implementers verify, not rewrite.
- **Determinism.** e2e runs in fake mode; the fake parser's new offset/needsDate rules make "in 5 days" and "at some point" reproducible without a key.
