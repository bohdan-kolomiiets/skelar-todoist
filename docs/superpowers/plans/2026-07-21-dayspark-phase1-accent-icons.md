# Dayspark UI Phase 1 — Coral Accent + Tabler Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make coral the single (AA-contrast) accent in the running app, finish the Tabler-icon adoption, and add a light Capture composer polish — aligning the UI with the Dayspark brand without touching the core flow.

**Architecture:** Token-first, minimal-diff. The app is fully token-driven, so the blue→coral swap is a redefinition of four accent tokens in `globals.css`; the ~9 call sites recolor automatically. The remaining work is bounded glyph→Tabler icon substitutions in four components (preserving accessible names) and one composer icon swap. No storage/AI/routing/schema changes.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · `@tabler/icons-react` · Vitest + RTL · Playwright.

## Global Constraints

_Every task's requirements implicitly include this section. Values copied verbatim from the design spec (`docs/superpowers/specs/2026-07-21-dayspark-phase1-accent-icons-design.md`)._

- **Accent tokens (retire blue → coral), AA-verified** in `src/app/globals.css`:
  - `--color-fill-accent: #c2410c` (was `#1f6fd0`) — primary button fills; white text on it = **5.18:1** ✓
  - `--color-text-accent: #c2410c` (was `#185fa5`) — accent text/icons, active tab, links; on white **5.18:1** ✓, on cream `surface-1` **4.63:1** ✓
  - `--color-bg-accent: #fbe9e1` (was `#e6f1fb`) — soft accent chip bg; deep-coral **icon** on it **4.40:1** ✓ (non-text needs 3:1)
  - `--color-on-accent: #ffffff` — unchanged.
- **Bright brand coral `#ff6a3d` is decorative only** (wordmark spark, mark, gradients) — never a functional token value.
- **Coral is reserved for meaning:** primary CTAs, active tab, AI moments. **Minor controls** (Show-completed toggles, editor "Done") are **neutral** (`text-secondary` / `text-primary`), not coral.
- **Accessibility is a hard requirement.** When swapping a glyph for an icon: the icon gets `aria-hidden` and the control's **accessible name must be preserved** (existing `aria-label`s stay; existing name-based test queries must keep passing). Icon sizes ~13–18px to match current usage.
- **Icons come from `@tabler/icons-react`** (the app package — filled variants like `IconFlagFilled` are available here, unlike the webfont). Outline for line icons.
- **No changes** to storage, AI, routing, or the `Task` schema. Keep Geist (no display font). Mobile-first. KISS / YAGNI / TDD.
- **Auto-recolored, no code change (verify only):** CaptureFlow "Plan it" (`bg-fill-accent`), ReviewScreen "Add N tasks" (`bg-fill-accent`), ConfirmSheet primary button (`bg-fill-accent`), TabBar active tab (`text-accent`), CaptureFlow "Try an example" wand (`text-accent`), VoiceComingSoonSheet icon chip (`bg-accent`/`text-accent`). These become coral via Task 1's token swap.

---

## File Structure

- `src/app/globals.css` — accent token values (Task 1).
- `src/components/screens/InboxScreen.tsx`, `TodayScreen.tsx` — Show-completed toggle → neutral (Task 1).
- `src/components/screens/ReviewScreen.tsx` (+ `.test.tsx`) — IconX, sun/inbox pill, arrows-exchange, section headers (Task 2).
- `src/components/task/TaskRow.tsx` (+ `.test.tsx`) — IconCheck, IconArrowRight (Task 3).
- `src/components/task/PriorityFlag.tsx`, `src/components/task/TaskEditorSheet.tsx` (+ `.test.tsx`) — IconFlagFilled; IconX + "Done" neutral (Task 4).
- `src/components/screens/CaptureFlow.tsx` (+ `.test.tsx`) — Plan it → IconSparkles (Task 5).

---

## Task 1: Coral accent tokens + neutral Show-completed toggles

**Files:**
- Modify: `src/app/globals.css` (lines 26–29, the accent tokens)
- Modify: `src/components/screens/InboxScreen.tsx`, `src/components/screens/TodayScreen.tsx` (the Show-completed toggle button)
- Test: `src/app/accent-tokens.test.ts` (new)

**Interfaces:**
- Produces: the coral accent token values every later task and auto-recolored call site depends on.

- [ ] **Step 1: Write the failing token test**

```ts
// src/app/accent-tokens.test.ts
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");

describe("accent palette (Dayspark Phase 1)", () => {
  it("uses the functional deep-coral accent, not the old blue", () => {
    expect(css).toContain("--color-fill-accent: #c2410c");
    expect(css).toContain("--color-text-accent: #c2410c");
    expect(css).toContain("--color-bg-accent: #fbe9e1");
    expect(css).not.toContain("#1f6fd0");
    expect(css).not.toContain("#185fa5");
    expect(css).not.toContain("#e6f1fb");
  });

  it("keeps the decorative bright brand coral available", () => {
    expect(css).toContain("--color-brand-coral: #ff6a3d");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/accent-tokens.test.ts`
Expected: FAIL — the file still contains `#1f6fd0` / `#185fa5` / `#e6f1fb`.

- [ ] **Step 3: Swap the accent token values in `globals.css`**

In `src/app/globals.css`, replace the three blue accent token lines:

```css
  --color-text-accent: #185fa5;
  --color-fill-accent: #1f6fd0;
  --color-on-accent: #ffffff;
  --color-bg-accent: #e6f1fb;
```

with the coral values (leave `--color-on-accent` as-is):

```css
  --color-text-accent: #c2410c;
  --color-fill-accent: #c2410c;
  --color-on-accent: #ffffff;
  --color-bg-accent: #fbe9e1;
```

- [ ] **Step 4: Neutralize the Show-completed toggles**

In BOTH `src/components/screens/InboxScreen.tsx` and `src/components/screens/TodayScreen.tsx`, find the Show-completed toggle button — it has `className="text-[13px] text-text-accent"` — and change `text-text-accent` → `text-text-secondary` (coral is reserved for primary/active/AI; this minor toggle stays neutral).

- [ ] **Step 5: Run test + sweep**

Run: `npm test -- src/app/accent-tokens.test.ts && npm run lint && npm run typecheck`
Expected: PASS; no lint/type errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css src/app/accent-tokens.test.ts src/components/screens/InboxScreen.tsx src/components/screens/TodayScreen.tsx
git commit -m "feat(ui): coral accent tokens (retire blue); neutral Show-completed toggles"
```

---

## Task 2: ReviewScreen — Tabler icons

**Files:**
- Modify: `src/components/screens/ReviewScreen.tsx`
- Test: `src/components/screens/ReviewScreen.test.tsx` (extend)

**Interfaces:**
- Consumes: `IconX`, `IconSun`, `IconInbox`, `IconArrowsExchange` from `@tabler/icons-react`.

- [ ] **Step 1: Add the failing assertions**

In `src/components/screens/ReviewScreen.test.tsx`, using the file's existing render setup (it already renders a proposal and queries by role/name), add inside the main `describe`:

```tsx
  it("uses Tabler icons for remove and the placement pill (P1)", () => {
    // (use the file's existing render-with-proposal helper/setup)
    const remove = screen.getAllByRole("button", { name: /remove/i })[0];
    expect(remove.querySelector("svg")).toBeInTheDocument();
    const pill = screen.getAllByRole("button", { name: /move to (inbox|today)/i })[0];
    expect(pill.querySelector("svg")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/screens/ReviewScreen.test.tsx`
Expected: FAIL — the remove button / pill render text glyphs (`✕`, `☀`/`📥`), no `<svg>` yet.

- [ ] **Step 3: Replace the glyphs with icons**

At the top of `src/components/screens/ReviewScreen.tsx` add:

```tsx
import { IconX, IconSun, IconInbox, IconArrowsExchange } from "@tabler/icons-react";
```

Then:
- The remove button body `✕` becomes `<IconX size={18} aria-hidden />` (keep the button's `aria-label={`Remove ${task.title}`}`).
- The placement pill label:
```tsx
  {task.doDate === today ? (
    <><IconSun size={14} aria-hidden /> Today</>
  ) : (
    <><IconInbox size={14} aria-hidden /> Inbox</>
  )}
  <IconArrowsExchange size={14} aria-hidden className="text-text-muted" />
```
  (replaces the `{… ? "☀ Today" : "📥 Inbox"}` text and the `<span aria-hidden … >⇄</span>`; the button keeps its `aria-label` and `gap-1.5`).
- The two section-count headers:
```tsx
  {todays.length > 0 && (
    <p className="flex items-center gap-1 text-[13px] text-text-secondary"><IconSun size={13} aria-hidden /> Today · {todays.length}</p>
  )}
  {inbox.length > 0 && (
    <p className="mt-1.5 flex items-center gap-1 text-[13px] text-text-secondary"><IconInbox size={13} aria-hidden /> Inbox · {inbox.length}</p>
  )}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/screens/ReviewScreen.test.tsx`
Expected: PASS (existing name-based tests still green + the new one).

- [ ] **Step 5: Sweep + commit**

Run: `npm run lint && npm run typecheck && npm test -- src/components/screens/ReviewScreen.test.tsx`

```bash
git add src/components/screens/ReviewScreen.tsx src/components/screens/ReviewScreen.test.tsx
git commit -m "feat(ui): Tabler icons on the Review screen (remove, placement pill, headers)"
```

---

## Task 3: TaskRow — Tabler icons

**Files:**
- Modify: `src/components/task/TaskRow.tsx`
- Test: `src/components/task/TaskRow.test.tsx` (extend)

**Interfaces:**
- Consumes: `IconCheck`, `IconArrowRight` from `@tabler/icons-react`.

- [ ] **Step 1: Add the failing assertions**

In `src/components/task/TaskRow.test.tsx`, using the file's existing render helper, add:

```tsx
  it("shows a Tabler check on a done task and an arrow on the move button (P1)", () => {
    // render a DONE task (status: "done") with the file's helper
    const complete = screen.getByRole("button", { name: /complete/i });
    expect(complete.querySelector("svg")).toBeInTheDocument();
    const move = screen.getByRole("button", { name: /move to/i });
    expect(move.querySelector("svg")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/task/TaskRow.test.tsx`
Expected: FAIL — done state renders the text `✓` and the move button a text `→`, no `<svg>`.

- [ ] **Step 3: Replace the glyphs with icons**

At the top of `src/components/task/TaskRow.tsx` add:

```tsx
import { IconCheck, IconArrowRight } from "@tabler/icons-react";
```

- The completion circle body `{done ? "✓" : ""}` becomes `{done ? <IconCheck size={13} aria-hidden /> : null}` (the icon inherits the circle's `text-surface-2` color when done).
- The move button body `→ {moveTarget === "today" ? "Today" : "Inbox"}` becomes:
```tsx
  <IconArrowRight size={14} aria-hidden /> {moveTarget === "today" ? "Today" : "Inbox"}
```
  (the button keeps `aria-label={`Move to ${moveTarget}`}`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/task/TaskRow.test.tsx`
Expected: PASS.

- [ ] **Step 5: Sweep + commit**

Run: `npm run lint && npm run typecheck && npm test -- src/components/task/TaskRow.test.tsx`

```bash
git add src/components/task/TaskRow.tsx src/components/task/TaskRow.test.tsx
git commit -m "feat(ui): Tabler check + move-arrow icons on TaskRow"
```

---

## Task 4: PriorityFlag icon + TaskEditorSheet (close icon + neutral Done)

**Files:**
- Modify: `src/components/task/PriorityFlag.tsx`
- Modify: `src/components/task/TaskEditorSheet.tsx`
- Test: `src/components/task/TaskEditorSheet.test.tsx` (extend)

**Interfaces:**
- Consumes: `IconFlagFilled`, `IconX` from `@tabler/icons-react`.

- [ ] **Step 1: Add the failing assertion (editor close icon)**

In `src/components/task/TaskEditorSheet.test.tsx`, using its existing render helper (renders with `open`), add:

```tsx
  it("uses a Tabler X for close (P1)", () => {
    const close = screen.getByRole("button", { name: /close/i });
    expect(close.querySelector("svg")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/task/TaskEditorSheet.test.tsx`
Expected: FAIL — close button renders the text `✕`, no `<svg>`.

- [ ] **Step 3: Update PriorityFlag**

Replace `src/components/task/PriorityFlag.tsx` with:

```tsx
import { IconFlagFilled } from "@tabler/icons-react";

export function PriorityFlag() {
  return (
    <span aria-label="High priority" title="High priority" className="inline-flex text-text-danger">
      <IconFlagFilled size={15} aria-hidden />
    </span>
  );
}
```

(If `IconFlagFilled` is not exported by the installed `@tabler/icons-react`, use `IconFlag` — verify the import resolves via `npm run typecheck`. Keep the `aria-label` on the span so the accessible name is unchanged.)

- [ ] **Step 4: Update TaskEditorSheet (close icon + neutral Done)**

At the top of `src/components/task/TaskEditorSheet.tsx` add:

```tsx
import { IconX } from "@tabler/icons-react";
```

- The close button body `✕` becomes `<IconX size={18} aria-hidden />` (keep `aria-label="Close"`).
- The "Done" button: change its className `text-text-accent` → `text-text-primary` (minor control → neutral; keep `font-medium`).

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/components/task/TaskEditorSheet.test.tsx`
Expected: PASS. (PriorityFlag has no own test file; it's exercised via TaskRow/ReviewScreen — confirm those suites stay green in Step 6.)

- [ ] **Step 6: Sweep + commit**

Run: `npm run lint && npm run typecheck && npm test`
Expected: all green (PriorityFlag's high-priority rendering is covered by TaskRow/ReviewScreen tests).

```bash
git add src/components/task/PriorityFlag.tsx src/components/task/TaskEditorSheet.tsx src/components/task/TaskEditorSheet.test.tsx
git commit -m "feat(ui): Tabler flag + editor close icon; neutral editor Done"
```

---

## Task 5: Capture composer — spark on Plan it

**Files:**
- Modify: `src/components/screens/CaptureFlow.tsx`
- Test: `src/components/screens/CaptureFlow.test.tsx` (adjust the existing Plan-it icon test)

**Interfaces:**
- Consumes: `IconSparkles` from `@tabler/icons-react`.

- [ ] **Step 1: Update the Plan-it icon test**

`CaptureFlow.test.tsx` already has a test asserting Plan it carries an `<svg>` (currently named for an arrow). Update it to reflect the AI spark:

```tsx
  it("shows a spark on Plan it to signal the AI moment (P1)", () => {
    renderFlow();
    const planIt = screen.getByRole("button", { name: /plan it/i });
    expect(planIt.querySelector("svg")).toBeInTheDocument();
  });
```

(Replace the old `it("shows an arrow icon on Plan it, …")` test with this one — same assertion, accurate name.)

- [ ] **Step 2: Run test**

Run: `npm test -- src/components/screens/CaptureFlow.test.tsx`
Expected: PASS (the button still has an `<svg>` — this step just renames/keeps the assertion; the icon swap is Step 3).

- [ ] **Step 3: Swap the icon**

In `src/components/screens/CaptureFlow.tsx`:
- In the import on line 5, replace `IconArrowRight` with `IconSparkles` (keep `IconWand, IconHelpCircle, IconMicrophone`).
- In the Plan it button, change `<>Plan it <IconArrowRight size={17} aria-hidden /></>` to `<>Plan it <IconSparkles size={17} aria-hidden /></>` (it inherits `text-on-accent` white on the coral fill).

- [ ] **Step 4: Run test + sweep**

Run: `npm run lint && npm run typecheck && npm test -- src/components/screens/CaptureFlow.test.tsx`
Expected: PASS, no unused-import lint error for `IconArrowRight`.

- [ ] **Step 5: Commit**

```bash
git add src/components/screens/CaptureFlow.tsx src/components/screens/CaptureFlow.test.tsx
git commit -m "feat(ui): spark (IconSparkles) on the Plan it AI action"
```

---

## Task 6: Full sweep + visual verification note

**Files:** none (verification task).

- [ ] **Step 1: Full sweep**

Run: `npm run lint && npm run typecheck && npm test && npm run test:e2e`
Expected: all green. The existing e2e specs (core flow, brand) should pass unchanged — no assertions depend on the accent color or the swapped glyphs (only comments referenced them).

- [ ] **Step 2: Deploy / preview verification note**

> On the PR's Vercel **preview**, eyeball the recolored UI: **Plan it** and **Add N tasks** are coral with white text (readable), the **active tab** is coral, the **Show-completed** toggles + editor **Done** read neutral (not coral), and the Review/TaskRow/editor glyphs are Tabler icons. Confirm nothing accent-colored regressed to blue. (Contrast is pre-verified in the spec's §4 table; the preview is the visual confirmation.)

---

## What comes after this plan

- **Phase 2** — per-screen "moment" polish (Capture/Review chaos→clarity reveal, "N sorted into your day", empty-state redesigns) — its own brainstorm → plan.
- **Phase 3** — sun/spark micro-animations; optional display font; raster 192/512 PWA icons.
- The OG-card wordmark weight follow-up from Phase 0 (bundle a Geist weight / outline the wordmark) is independent.

---

## Self-review (completed while writing)

- **Spec coverage.** Token swap (spec §4 → Task 1), minor-controls-neutral (§2 → Tasks 1 & 4), icon map (§5 → Tasks 2–4), composer spark (§6 → Task 5), testing incl. preserved a11y names + token smoke (§7 → each task + Task 6). Auto-recolored call sites named in Global Constraints and verified in Task 6, not dropped.
- **Placeholder scan.** Every code step shows the exact edit; test steps that extend existing files name the file + give the assertion and say to reuse the file's render helper (the two test files' helpers aren't reproduced because the implementer opens the file — the assertions are complete). No TBDs.
- **Type/name consistency.** Icon names (`IconX`, `IconCheck`, `IconSun`, `IconInbox`, `IconArrowsExchange`, `IconFlagFilled`, `IconSparkles`, `IconArrowRight`) are all from `@tabler/icons-react`; `IconSun`/`IconInbox` are already imported by `TabBar.tsx`, `IconArrowRight` by `CaptureFlow.tsx` — confirming the package exports them. `IconFlagFilled` carries an explicit `IconFlag` fallback. Accessible names (`Remove …`, `Move to …`, `Complete`/`Completed`, `Close`, `High priority`, `Plan it`) are unchanged, so existing name-based queries keep passing.
- **Verified before writing:** no test asserts on a literal glyph (grep found the glyphs only in two ReviewScreen.test comments); accent usages are all token-driven (grep), so the swap needs no per-component color edits beyond the three neutralized minor controls.
