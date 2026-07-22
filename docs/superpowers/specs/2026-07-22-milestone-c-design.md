# Milestone C + Cleanups — Design

> Status: **approved (brainstorm)**, ready for plan. 2026-07-22.
> Closes the remaining core-flow polish (PRODUCT §4/§7/§9/§10) + the deferred robustness
> items and access-ladder review cleanups. Builds on the shipped access ladder (M1–M3).

## Goal

Finish the graded core flow's edge cases and quality bar: ambiguous items get a **"Needs a
date"** home, **quick-add** gains the AI entry point, empty/edge results are handled honestly,
dates resolve against the **user's** clock (incl. relative offsets), and the accumulated
review-flagged cleanups land — plus two owner-requested fixes (a Welcome-gate that actually
guards the app, and Capture composer polish).

## Non-goals

- No new product surfaces beyond the quick-add "New task" sheet (Welcome/Plans/Settings exist).
- No real backend; storage/auth/usage/waitlist stay the swappable `localStorage` seams.
- Voice stays the fake-door (M3). Notifications / Week / auto-rollover remain out (§16).

## Scope — one spec, four grouped milestones (built in order)

| Milestone | Delivers |
|---|---|
| **C1 — Robustness + cleanups** | empty-parse UX, client-tz `today` + relative offsets, deadline 3-tier, **Welcome guard on the `(app)` group**, **Capture chip/padding polish**, `useIsHydrated()` extraction, PlansScreen test + padding, waitlist `@`-guard + test, a11y/doc polish |
| **C2 — Needs-a-date** | AI schema `needsDate` flag + prompt + fake-parser detection; `groupInbox` "Needs a date" group; Inbox section + resolve affordance |
| **C3 — Quick-add AI** | `QuickAddSheet` (free text → Parse with AI → editor/Review, + Enter manually) via a shared `useGatedOrganize()` hook; wired into Today/Inbox `+ Add task` |
| **C4 — Pull-from-Inbox** | Today's empty-state "pull from Inbox" becomes a real link |

Each milestone is independently shippable; existing tests (unit 230 + e2e 9) stay green.

## Decisions locked (this brainstorm)

1. **Needs-a-date signal = AI flags it + fake parser detects it.** `needsDate?: boolean` is added
   to the AI output schema; the model sets it (leaving `doDate` null) when it senses timing intent
   it can't resolve. `FakeTaskParser` sets it via regex on unresolved temporal wording.
2. **Quick-add lives in a lightweight `QuickAddSheet`** (matches mockup `new-task-ai-entry.html`):
   free-text field + **Parse with AI** (default) + **Enter manually** escape — not the Capture tab.
3. **Deadline badge = §6 three tiers:** neutral far-future (>7 days), warning within 7 days, danger
   overdue.
4. **Empty parse (0 tasks) → stay on Capture** with an inline notice; keep the dump; the AI input
   still counted.
5. **Quick-add "Parse with AI" counts as one daily AI input** (§14) and is gated by the same limit
   as Capture. *Enter manually* is always free. Both share `useGatedOrganize()`.

---

## C1 — Robustness + cleanups

### Empty-parse UX
`CaptureFlow.planIt()` (and `useGatedOrganize`, C3): after `organize()`, if `tasks.length === 0`,
set an inline notice — **"I couldn't find any tasks in that — try rephrasing."** — and do **not**
set `proposal` (composer + dump stay). `markOrganized()` still only fires when `tasks.length > 0`.
The distinction is `proposal === null` (no parse yet) vs. a real empty result (notice shown).

### Client-tz `today` + relative offsets
- `organizeClient.organize(text)` sends `{ text, today: todayISO() }` (the browser's local date).
- `POST /api/organize` reads `today` from the body; validates it's a `YYYY-MM-DD` string, else
  falls back to the server `todayISO()`. Passes it to `new FakeTaskParser({ today })` and into the
  system prompt (`buildSystemPrompt(today)`).
- **Prompt** gains relative-offset rules resolved against the given today: `in N days → +N`,
  `next week / in a week → +7`, `in N weeks → +7N` → `doDate`.
- **`FakeTaskParser`** gains the same: `resolveDate`/routing recognize `in N days`, `next week`,
  `in N weeks`. Title-cleaning strips the matched phrase.
- **Golden dataset** (`src/lib/ai/fixtures/parseCases.ts`) gains `"grab delivery in 5 days" →
  doDate = today+5`, eval- and snapshot-verified. Closes the parked "in 5 days" bug.

### Deadline badge 3-tier
`deadlineBadge` already returns `normal | warning | danger`. Fix `DeadlineBadge` so a `normal`
tone renders the **neutral** chip (not upgraded to orange). Result: far-future = neutral, ≤7 days =
warning, overdue = danger. Component test per tier.

### Welcome guard on the `(app)` group  *(owner request)*
A client `RequireProfile` guard in `src/app/(app)/layout.tsx` (inside `AuthProvider`): once
**hydrated** (`useIsHydrated()`), if `useAuth().profile === null` → `router.replace("/welcome")`
and render nothing meanwhile. Guards `/capture`, `/today`, `/inbox` so a first-time deep-link is
sent through Welcome (where "Get started" mints the guest profile). **Not** applied to the
`(account)` group (`/plans`, `/settings`) — both are reachable pre-guest from Welcome and already
handle a null profile. Guarding only after hydration avoids an SSR/first-render redirect.

> Root-cause note: without this guard a pre-guest deep-linking to `/capture` has no profile, so
> `markOrganized()` is a silent no-op and the first-run chip never hides — this guard is also what
> makes the Capture chip fix below correct.

### Capture composer polish  *(owner request)*
- Hide the **"Try an example"** chip once the user has used the app: `firstRun && tasks.length === 0`
  (i.e. chip shows only for a fresh profile with no tasks; hidden after the first organize **or** any
  manual add). `firstRun` stays `profile?.hasOrganizedOnce !== true`.
- When the chip is absent, **tighten the textarea's top spacing** so the input text sits closer to
  the top of the field (remove the gap the chip row used to occupy).

### `useIsHydrated()` extraction
Create `src/lib/hooks/useIsHydrated.ts` exporting `useIsHydrated(): boolean` (the
`useSyncExternalStore(neverSubscribe, ()=>true, ()=>false)` trio). Refactor `AuthProvider`,
`TaskStoreProvider`, `usePersistentState`, and `CaptureFlow` to consume it — **pure dedupe, no
behavior change** (verified by the existing tests staying green). `RequireProfile` (above) uses it too.

### Small fixes (review roll-ups)
- **PlansScreen**: add the pre-guest (`profile === null`) test (Get-started link, no Upgrade/Downgrade);
  give the Downgrade button horizontal padding (`px-4`) for tap-target parity.
- **Waitlist email**: guard `submit` in `VoiceComingSoonSheet` with a light `/.+@.+/` check (block
  obviously-malformed leads); add the name-only-signin branch test (no email → email field).
- **a11y**: `TaskEditorSheet` dialog gets `aria-modal="true"` + a focus trap / initial focus + Escape
  to close; `TaskRow`'s open control gets `aria-label={`Open ${task.title}`}` with metadata
  `aria-hidden`.
- **Schema guard**: add a compile-time `type _Check = z.infer<typeof modelTaskSchema> satisfies
  ParsedTask` (or equivalent) so schema/type drift fails typecheck.

---

## C2 — Needs-a-date

### Signal
- `parsedTaskSchema` / `modelTaskSchema` (`src/lib/ai/schema.ts`) gain optional `needsDate?: boolean`.
  The system prompt instructs: when the input expresses timing you cannot resolve to a concrete
  date, **leave `doDate` null and set `needsDate: true`** (keep the raw wording in the title).
- `FakeTaskParser` sets `needsDate: true` when a clause has temporal wording it could not resolve
  (e.g. matched a date-ish token with no resolution, or vague phrases `later`, `sometime`, `soon`,
  `at some point`) **and** `doDate` ends up null. (Explicit `someday`/`one day` stays plain
  someday — a deliberate backlog, not "needs a date".)
- `createTask` already carries `needsDate` through to the `Task`. No routing change: a `needsDate`
  task has `doDate === null`, so it's an Inbox item — but grouped into its own section.

### Grouping + UI
- `groupInbox(tasks, today)` returns `{ needsDate, scheduled, someday }` — `needsDate` =
  `doDate === null && needsDate === true`; `someday` = `doDate === null && !needsDate`.
- `InboxScreen` renders **"Needs a date · N"** as the **top** section (above Scheduled/Someday),
  with a short hint. The **resolve affordance** is tapping the row → the existing `TaskEditorSheet`
  (set a When). Once dated (or moved), the task leaves the section naturally.
- Tests: `groupInbox` 3-way split; `FakeTaskParser` flags an unresolved-timing clause; a golden case
  (`"call the vet at some point" → needsDate, doDate null`); `InboxScreen` renders the section.

---

## C3 — Quick-add AI

### `useGatedOrganize()` (shared hook)
Extract the metering gate from `CaptureFlow` into `src/lib/ai/useGatedOrganize.ts`:
`useGatedOrganize()` → `{ run(text): Promise<OrganizeResult | "blocked" | "empty">, limitOpen,
closeLimit, used, limit }`. It performs the pre-check (`!isPro && remaining ≤ 0` → open limit sheet,
return `"blocked"`), calls `organize(text)`, increments usage on success (non-Pro), caches
`freeDailyInputs`, and reports `"empty"` on 0 tasks. `CaptureFlow` is refactored to use it (its
current inline gate/increment/limit-sheet logic moves into the hook — behavior-preserving, its tests
stay green). The limit sheet + "N left" meter render from the hook's state in both consumers.

### `QuickAddSheet`
`src/components/task/QuickAddSheet.tsx` (over `BottomSheet`), props `{ open, onClose,
defaultDoDate }`: a header ("New task" · "One task opens the editor · several open Review"), a
free-text field, **Parse with AI** (primary) and **Enter manually** (secondary). It uses
`useGatedOrganize()`.
- **Parse with AI** → `run(text)`:
  - `"blocked"` → the shared limit sheet (→ Plans).
  - `"empty"` → inline "couldn't find any tasks" notice in the sheet.
  - **1 task** → close sheet, open `TaskEditorSheet` prefilled with the parsed task → save = `addTask`.
  - **several** → close sheet, show `ReviewScreen` **inline as a full-screen overlay** (reusing its
    `proposal`/`onCommit`/`onStartOver` props) → commit = `addTasks`.
- **Enter manually** → close sheet, open a blank `TaskEditorSheet` (When = `defaultDoDate`, i.e. the
  current tab's default: today on Today, null on Inbox).
- **Placement follows the parse** (§9 rule 1): a parsed future date lands in Inbox even when added
  from Today; the user sees it in the editor/Review before saving.

### Wiring
`TodayScreen` / `InboxScreen`: `+ Add task` opens `QuickAddSheet` (instead of the editor directly),
passing `defaultDoDate` = `today` / `null`. The editor and inline Review are hosted by the screen
(they already host the editor). Tests: sheet renders + Enter-manually opens the blank editor;
Parse-with-AI 1-task opens a prefilled editor; several opens the inline Review; blocked shows the
limit sheet. e2e: quick-add a single task via AI from Today.

---

## C4 — Pull-from-Inbox affordance

`TodayScreen` empty state (when `hasInbox`): render "Nothing planned — capture your thoughts or
**pull from Inbox**" where "pull from Inbox" is a `Link` to `/inbox`. When the Inbox is empty, the
copy stays "Nothing planned — capture your thoughts" (no link). Copy matches §10 verbatim. Test:
the link renders only when the Inbox has active items.

---

## Error handling & edge cases

- **`today` in the request** — malformed/absent → server falls back to its own `todayISO()` (never
  throws); the parse still works, just against the server date.
- **Empty parse** — handled as an inline notice (C1), never an empty Review; commit is never enabled
  on zero tasks.
- **Welcome guard** — only redirects post-hydration; legacy-data adoption means a returning user with
  tasks has a (guest) profile, so they're not bounced to Welcome.
- **Quick-add while at the limit** — the gate fires before any parse; *Enter manually* remains free.
- **`needsDate` vs someday** — explicit `someday`/`one day` never sets `needsDate`; only unresolved
  timing does.
- **Deadline badge** — exactly-7-days = warning, 8+ = neutral, today/overdue unchanged.

## Testing (pyramid + TDD)

- **Unit** — `deadlineBadge`/`DeadlineBadge` 3 tiers; `FakeTaskParser` relative offsets + `needsDate`;
  `groupInbox` 3-way; `useIsHydrated`; `useGatedOrganize` (gate/increment/empty); waitlist `@`-guard;
  schema `satisfies` guard (compile-time).
- **Component (RTL)** — empty-parse notice; Welcome guard redirects a pre-guest and not a guest;
  Capture chip hidden when tasks exist / spacing; Inbox "Needs a date" section; `QuickAddSheet`
  branches (manual / 1 / several / blocked / empty); Today pull-from-Inbox link; PlansScreen
  pre-guest.
- **e2e (fake mode)** — (1) a dump with an unresolved-timing item lands in "Needs a date" and is
  resolvable via the editor; (2) quick-add a task via AI from Today.
- Existing **230 unit + 9 e2e** stay green (changes are additive / behavior-preserving refactors).

## Open / deferred (not in this spec)

- Deeper parser hardening (hyphenated "past-due", eval-parser tsc include) — low-priority demo parser.
- The `used`-staleness on a hypothetical in-place Capture sign-in/upgrade (documented; unreachable
  today).
- Dayspark UI Phase 2/3 (separate roadmap).
