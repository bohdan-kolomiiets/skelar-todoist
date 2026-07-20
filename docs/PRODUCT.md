# Product Spec — AI Day Planner

> **Status: living spec.** Data model, core flow, the **access / onboarding / freemium**
> model, and **all core-screen layouts** are **locked** (brainstorm — 2026-07-19–20).
> Next: turn this into an implementation plan. See [§15 Screens](#15-screens).
>
> This is the source of truth for the **UI↔AI contract**. Raw requirements +
> grading criteria live in [BRIEF.md](./BRIEF.md); status in [PROGRESS.md](./PROGRESS.md).

## 1. What we're building

Mobile-first AI day planner (Todoist-style). Core loop:

> **brain dump (text; voice later) → AI structures it into tasks → a clean "Today" plan.**

This end-to-end scenario is the graded MVP and must work reliably. AI is the engine
of the loop, not a decoration.

## 2. Core model

### Two independent "when"s

- **do-day** (`doDate`) — the day you intend to *do* the task. Decides **which screen**
  it appears on.
- **deadline** (`deadline`) — when it's *due* (optional, a hard constraint). A
  badge / urgency signal only; it **never** decides the screen.

Conflating these into one "date" is the classic planner mistake. Keeping them
separate matches Todoist's own Dates-vs-Deadlines split ("date = when you plan to
work on it"; "deadline = until when it must be done").

### One list, filtered views

There is a **single task list** in storage. The screens are just filters over it:

- **Today** = tasks whose `doDate` is today.
- **Inbox** = everything else — unscheduled backlog (`doDate === null`) or a future `doDate`.

A future **Week** tab is just another filter — no re-architecture needed.

## 3. The `Task` schema (UI↔AI contract) — LOCKED

```ts
type Priority   = 'high' | 'medium' | 'low' | 'none';
type TimeOfDay  = 'morning' | 'afternoon' | 'evening';
type TaskStatus = 'active' | 'done';

interface Task {
  id: string;                    // app-assigned (uuid)
  title: string;                 // short imperative, AI-normalized ("Book dentist")
  notes?: string;                // optional extra detail from the dump

  doDate: string | null;         // "YYYY-MM-DD". null = Inbox backlog. === today → Today view
  time: string | null;           // "HH:mm" exact start (optional)
  timeOfDay: TimeOfDay | null;   // coarse bucket; drives ordering when no exact time
  deadline: string | null;       // "YYYY-MM-DD" (or datetime) hard due date — badge/urgency only

  priority: Priority;            // default 'none' (see §5)
  tags: string[];                // freeform topical labels, AI-suggested + user-custom

  status: TaskStatus;
  createdAt: string;             // ISO
  completedAt: string | null;
  order: number;                 // manual sort within a view (for reordering)
}
```

| Field | Meaning |
|---|---|
| `title` | Short imperative task text, normalized by the AI from the raw dump. |
| `notes` | Optional detail the AI keeps but doesn't fit in the title. |
| `doDate` | The do-day. `null` → Inbox backlog; `=== today` → Today; future → Inbox with a date badge. |
| `time` | Exact start time, if the user gave one. Primary ordering key on Today. |
| `timeOfDay` | Coarse bucket (morning/afternoon/evening); ordering key when no exact `time`. Rendered as a chip. |
| `deadline` | Hard due date. Drives the deadline badge (§6); never routes the task. |
| `priority` | Default `none`; the AI sets only `high` in MVP (§5). |
| `tags` | Freeform topical labels (work, errand, health…). AI suggests them and reuses the user's custom tags. |
| `status` | `active` or `done`. |
| `order` | Manual position within a view (drag-reorder). |

### AI output contract

The AI returns an **array of the parseable fields only**:
`title`, `notes`, `doDate`, `time`, `timeOfDay`, `deadline`, `priority`, `tags`.
The app hydrates `id`, `status`, `createdAt`, `completedAt`, `order`. The **mock LLM**
(tests / local dev) and the **real LLM** both honor this exact shape — it is the
boundary that gets mocked in unit/integration tests.

## 4. Routing: Today vs Inbox

The AI assigns `doDate` (and therefore the landing screen) per these rules:

**→ Today** when the item is:
- clearly stated as for today, **or**
- given a time only (no date) that is still ahead today, **or**
- given a part-of-day only that falls today.

**→ Inbox** when the item is:
- unclear / undated, **or**
- explicitly for another date, **or**
- an impossible/past time for today, **or**
- deadline-only for another date (has a due date but no do-day).

**Default do-day = today.** We do **not** infer morning-vs-evening intent (e.g. an
evening dump does not silently become "tomorrow"). If the user means tomorrow, they
say "tomorrow" and the AI dates it. `doDate` is a real date inferred by the AI from
the user's wording where possible.

**Ambiguous dates/times** ("sometime next week"; "Thursday" — which one?; "at 5" — am/pm?)
are **not guessed**: the AI leaves the field empty, keeps the raw wording, and the task
lands in Inbox as **unscheduled, flagged "needs a date"** (non-blocking) for the user to
resolve. See the parse rules in §9.

## 5. Priority — default-off

Modeled on Todoist (default = no priority) to avoid the "everything becomes medium" trap:

- `priority` defaults to **`'none'`**.
- **MVP: the AI sets only `'high'`**, and only on explicit signals ("urgent",
  "important", "ASAP", "must", "!!"). It never guesses importance → ethical, and no
  forced middle floods the UI.
- **UI marks only `high`** (a small red flag/dot). Everything else is clean — no chip.
- The enum keeps `medium` / `low` unused for later at **zero migration cost**.

## 6. Deadline badge

Driven by `deadline` (never routes the task):

- **Within 7 days, not past** → relative countdown: "due today" / "due tomorrow" / "due in 3 days".
- **Further out** → absolute date: "due Jul 24" (with time if one was given).
- **Past (overdue)** → "overdue" / "due 2 days ago" in a warning color, so nothing slips silently.

## 7. Today layout & ordering

**Ordering:** `exact time` (asc) → `timeOfDay` bucket (morning → afternoon → evening) →
`priority` → manual `order`. Matches Todoist's rule: **timed tasks first, then priority.**

**Layout:** tasks are **grouped under Morning / Afternoon / Evening / Anytime** headers
(timed tasks slot into their bucket; tasks with no time cue fall to **Anytime**). Flat
chronological is the easy fallback if "Anytime" ends up dominating.
- **Overdue** (`doDate` < today, still active) surfaces in an **"Overdue"** section at the
  top — nothing silently vanishes (no auto-rollover yet).
- **"+ Add task"** is a manual quick-add (§9 add-model).
- A small **"N of M done"** progress line sits under the date; **completed** tasks show
  crossed-out with a show/hide toggle (§11).

Mockup: [today.html](./mockups/today.html).

### Inbox layout

Everything not on Today, grouped by intent: **Needs a date** (ambiguous, flagged — top, to
resolve) → **Scheduled** (future do-dates, soonest first, with date badges) → **Someday**
(undated backlog). **"+ Add task"** defaults When = Inbox. Mockup: [inbox.html](./mockups/inbox.html).

### Moving between Today and Inbox

Each row carries a one-tap arrow — **→ Today** (accent, on Inbox) and **→ Inbox** (muted, on
Today). The arrow does the **unambiguous default**: Inbox→Today sets `doDate = today` (no time →
Anytime); Today→Inbox **unschedules to Someday** (`doDate = null`). For a *specific* date / time /
part-of-day, tap the task → the editor's When / Time / Part-of-day rows. (Optional: a
"Moved · Edit" toast to reach the editor in one tap.)

### Completion is orthogonal to placement

`status` (active/done) is independent of `doDate`, so a task can be **completed from any view**
(a Someday item done; a future task done early) — never forced to schedule something just to tick
it off. Done tasks show crossed-out under a **"Completed · N"** toggle in whichever list matches
their do-day.

## 8. Tags

Freeform **topical** labels only (work, errand, health…). Part-of-day is **not** a tag —
it's the structured `timeOfDay` field, merely *rendered* as a chip. The AI suggests
tags and **recognizes the user's existing custom tags** when related things are
mentioned, applying them during parse.

## 9. Capture → Review → Save flow

1. **Capture** — a **composer** (controls docked to the field, Claude/Gemini/Todoist-style),
   under the header title "Your AI Planner". Placeholder: *"What's on your mind? — Get
   everything out of your head — tasks, errands, deadlines. I'll sort it into your day."*
   The action row holds a **Tips** link (opens the "how it reads your dump" guide), a
   **voice** teaser (disabled — §16), and the primary **Plan it** button. First-run only:
   a **"Try an example"** chip in the field's top-right corner + a phrasing tip below.
   Text now; voice later. Mockup: [capture-first-run.html](./mockups/capture-first-run.html).
2. **Parse** — the AI structures the dump into proposed tasks (server-side; key stays
   in `src/app/api/*`). Consumes one AI input against the daily limit (§14).
3. **Review** — proposed tasks grouped into **Today / Inbox** sections. Inline per card:
   a **placement pill** (move Today↔Inbox) + a **remove ×**. Tapping a card opens the
   **shared task editor** (title, notes, when, time, part-of-day, priority, deadline, tags)
   — reused on Today/Inbox. Its rows use **native date/time pickers** and inline toggles;
   only **Tags** is a bespoke control (§8). Commit is dynamic — **"Add N tasks"**; discard
   is **"Start over"**. Drag-reorder / drag-between-sections are deferred to later. Mockups:
   [review.html](./mockups/review.html), [task-editor.html](./mockups/task-editor.html).
4. **Save** — commits the reviewed tasks to the lists. The **first** Save triggers the
   guest→account nudge (§12).

This propose → review → commit shape keeps the user in control (Sunsama-style)
rather than auto-scheduling everything (Motion-style).

### Entry points (the add-model)

| Entry | Path |
|---|---|
| **Capture** tab | AI dump → Review → save |
| **+ Add task** (AI, one) | free text → *Parse with AI* → editor (prefilled) → save |
| **+ Add task** (AI, several) | free text → *Parse with AI* → Review → save |
| **+ Add task** (manual) | editor (blank; When defaults to the current tab) → save |

**Quick-add is two clean modes, never a mashup.** "+ Add task" opens a free-text field
(AI, default) with an *Enter manually* escape. The **controls editor is always the final
step** — the parse *transitions into* it and never edits live beside your manual choices,
so there's no "did the parse overwrite what I set?" ambiguity.

### Parse rules (Capture + quick-add — one behavior)

1. **Placement follows the parse, not the entry point** — a task parsed to a future date
   goes to Inbox (dated badge) even if added from Today; you see it before saving and can override.
2. **Count decides the surface** — one task → the editor; several → Review (still one AI input, §14).
3. **Ambiguity → don't guess** — unclear dates/times stay empty, keep the raw wording, and
   the task lands in Inbox **flagged "needs a date"** (non-blocking, §4).

Mockups: [new-task-ai-entry.html](./mockups/new-task-ai-entry.html), [review-edge-cases.html](./mockups/review-edge-cases.html).

## 10. Empty states (copy — verbatim)

- **Today empty, Inbox has items:** "Nothing planned — capture your thoughts or pull from Inbox"
- **Today empty, Inbox empty:** "Nothing planned — capture your thoughts"
- **Inbox view empty:** "Inbox zero — nothing waiting, capture your thoughts"

Mockup: [empty-states.html](./mockups/empty-states.html).

## 11. Completed tasks

Done tasks show **crossed-out** under a **"Completed · N"** show/hide toggle — the **same on
Today and Inbox** (a done task appears in whichever list matches its do-day). Completion works
from any view; see §7 ("completion is orthogonal to placement").

## 12. First run & access — the 3-rung ladder

Everything here is **faked + swappable**: an `AuthService` (passwordless,
`localStorage`-backed) and an entitlements/`BillingService` interface in `src/lib` —
no real accounts, no real payments — same pattern as storage. Real auth/billing can
drop in later without touching UI.

**Guest-first entry.** A **Welcome** screen → *Get started* drops you straight in as a
local guest (data in `localStorage` under a guest profile); a smaller *Sign in* offers
a fake passwordless login (email or name, no password).

**The ladder — try → save → power.** Each rung has one honest reason to climb:

| Rung | You are | What you get | Nudge to climb |
|---|---|---|---|
| **Guest** | anonymous, 1 tap in | full core flow (this browser only) | *try it* |
| **Free account** | signed in (fake, passwordless) | same core, **saved & yours** | *"save your plan so you don't lose it"* |
| **Pro** (faked) | upgraded | the power lever (§14) | *"unlimited AI / premium features"* |

**Conversion moments** (both non-blocking, both dismissible):
- **Guest → Free:** the first *Save* → soft card *"Keep this plan? Sign in to save it."* + *"Continue as guest."*
- **Free → Pro:** hitting the daily AI limit **or** tapping a Pro-locked feature → soft upgrade sheet → **Plans** (§14).

**Honesty note.** In the faked MVP, "sign in" just moves data from the guest bucket to
a user bucket in `localStorage` — no real cross-device sync yet. Copy stays to what's
true (**"save your plan"**); "sync across devices" is marked *coming soon*. The
swappable interface makes the promise real once a backend lands.

## 13. Onboarding & landing

**Onboarding *is* the first brain dump** — no tutorial wall. It doubles as the fix for
the "empty screen looks like a bug" risk the brief flags.

**Landing rule (data-driven):** any task exists → **Today**; otherwise → **Capture.**
This covers both a true first run and "came back but never saved" — it's *"do you have
a plan yet,"* not a visit counter.

**Capture content** keys off a one-time `hasOrganizedOnce` flag (persisted with the profile):
- Before the first *Organize* → intro treatment: a **"Try an example"** chip (top-right
  corner of the field, fills a sample dump) + a phrasing tip line below.
- After it → steady-state: the same composer **minus** the corner chip and tip line — a
  near-full-screen field with just Tips, voice, and Plan it.

Locked placeholder (format-agnostic, so it still reads right once voice exists):
*"What's on your mind? — Get everything out of your head — tasks, errands, deadlines.
I'll sort it into your day."*

**The example dump** is chosen to show off the parser in one shot, e.g.:

> *"Finish the pitch deck today, due Friday. Gym this evening. Reply to Anna — urgent. Someday read that design book."*

→ deck (**Today**, "due Fri" badge, high-priority), gym (**Today**, evening chip),
reply Anna (**Today**, high), read book (**Inbox** / someday) — demonstrating routing,
deadline, part-of-day, and priority together.

## 14. Plans & freemium

**The one metered lever: AI inputs per day.** One *Organize* tap = one AI call = one
"input" (however many tasks come back). Reviewing, editing, moving, saving, checking
off — all **free** (no AI). Re-running the same text counts again. It's the only thing
that maps to real cost.

- **Free:** `freeDailyInputs` per day — **demo: 3**, long-term default: 5 — resets at local midnight.
- **Pro (faked):** unlimited AI inputs.
- **Tasks are never capped** on any tier (storage is ~free; a cap would punish engagement).

**Config — runtime, no redeploy.** `freeDailyInputs` lives in **Vercel Edge Config**
(updatable from the dashboard/API without a deploy), read at the `/api/organize`
boundary via `@vercel/edge-config`, with a **hardcoded `3` fallback** if unset/unavailable.
The daily **count** is tracked client-side via a `UsageService` (`localStorage`) for
the faked MVP — bypassable, fine while faked; moves server-side with the real backend.

**Plans screen.** Free-vs-Pro comparison (Free = full core + 3 AI inputs/day; Pro =
unlimited AI + voice / Week / notifications tagged *coming soon*), a current-plan
marker, and a **one-tap fake "Upgrade to Pro"** (no card, clearly a demo).
**Reachable from:** Settings ("Plan: Free · Upgrade"), the limit-reached sheet, any
Pro-locked feature tap, and a "What's included" link on Welcome.

## 15. Screens

Surface inventory (mobile-first, large one-handed touch targets):

**Primary — bottom tab bar:**
- **Capture** — the brain-dump entry point (§9 step 1, §13).
- **Today** — today's plan, chronologically ordered (§7), done tasks crossed-out (§11).
- **Inbox** — the backlog + future-dated items, with date/deadline badges.

**Outside the tab bar:**
- **Welcome** — first open, pre-guest (§12): value prop, *Get started*, *Sign in*, "What's included".
- **Review** — the AI's proposed changes, editable before Save (§9 step 3).
- **Plans** — Free vs Pro, fake upgrade (§14).
- **Settings** — account/plan, show/hide completed (§11), guidance link.

**Mockups** (low-fi, open in any browser): **Capture** — [`capture-first-run.html`](./mockups/capture-first-run.html), [`capture-voice-notify.html`](./mockups/capture-voice-notify.html), [`capture-voice-on-list.html`](./mockups/capture-voice-on-list.html); **Review** — [`review.html`](./mockups/review.html), [`review-edge-cases.html`](./mockups/review-edge-cases.html); **Editor** — [`task-editor.html`](./mockups/task-editor.html); **Add** — [`new-task-ai-entry.html`](./mockups/new-task-ai-entry.html); **Today** — [`today.html`](./mockups/today.html); **Inbox** — [`inbox.html`](./mockups/inbox.html); **Empty** — [`empty-states.html`](./mockups/empty-states.html). **All core screens locked. Welcome / Plans / Settings remain (behavior specified in §12/§14; mockups optional).**

Detailed layouts, componentization, and interaction design are the **next brainstorm step**.

## 16. Out of MVP scope (design for, build later)

- **Voice** input (text must be flawless first) — in MVP, shipped only as a **teaser** (below).
- **Notifications**: deadline / do-time reminders → push → deep-link to the task.
- **Week** tab (another filter over the same list).
- **Auto-rollover** of unfinished tasks to the next day.

*(The last three double as Pro "coming soon" features in §14.)*

### Voice teaser + waitlist (fake-door)

Voice ships in the MVP as a **fake-door demand test**, not a working feature:

- The Capture mic is **disabled-grey**; tapping it opens a sheet — *"Talk instead of type — coming soon."*
- **Every tap is logged** (usage layer) → a real signal of how many people want voice, and the honest input to the still-open "is voice a Pro feature?" call (kept tier-neutral for now).
- The sheet offers an optional **"Notify me"** → a **waitlist** lead stored via a swappable `WaitlistService` (`localStorage` now) as `{ email, feature: 'voice', createdAt, userId? }`. Signed-in → email known, one tap; guest → email field. **Waitlist ≠ registration** — it never creates an account (link/dedupe later in a real backend).
- The mic is **stateful**: not-joined → the email sheet; already-joined → a "You're on the list" confirmation. Copy stays honest (it's fake — no email is actually sent yet).
- Mockups: [capture-voice-notify.html](./mockups/capture-voice-notify.html), [capture-voice-on-list.html](./mockups/capture-voice-on-list.html).

## 17. Constraints (from CLAUDE.md / BRIEF.md)

- **Mobile-first** — large touch targets, one-handed use.
- **Client state via `localStorage` behind swappable `src/lib` interfaces** — storage,
  auth, billing/entitlements, usage, and waitlist all replaceable with a real backend/DB
  without touching UI.
- **Secrets server-side only** — the AI key lives in `src/app/api/*`, never in the client/git.
- **Test pyramid + TDD** — Vitest (unit/component), Playwright (e2e); mock the LLM at the boundary.
- **KISS / YAGNI / SOLID / DRY.**

## 18. Open / parked decisions

_None — all core-flow screen decisions resolved (2026-07-20). Remaining, non-blocking:
Welcome / Plans / Settings mockups (behavior already specified in §12/§14)._
