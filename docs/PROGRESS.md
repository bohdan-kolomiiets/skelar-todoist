# Progress Log

> Living status for the project. **Update at the end of each working session** —
> move items from Next → Done, record new decisions, note the next concrete step.
>
> Last updated: 2026-07-21

## Current phase
**Phase 2 — core flow merged (PR #3); issue #4 P1 + AI provider switch done (PR #7, awaiting merge).**
The graded MVP works end-to-end (brain dump → AI → review → save → "Today"). **Real AI is unblocked:**
`anthropic/claude-haiku-4.5` runs on the user's own Anthropic account via the direct `@ai-sdk/anthropic`
SDK (`AI_API_KEY`); `openai/gpt-4o-mini` is the free-tier gateway default; runtime-switchable via Edge
Config `aiModel`. Any real-parser failure degrades to the fake parser with an honest notice. Verified:
eval **5/5** both models; unit **121**, e2e **4/4**, lint+typecheck clean; whole-branch review 0
Critical/Important. Still open on #4: **P2/P3** (flow-UX + Tabler icons).

## Done
- [x] Git repo on `main`; GitHub remote (`github.com:bohdan-kolomiiets/skelar-todoist`)
- [x] Minimal Next.js 16 scaffold (App Router, TypeScript, Tailwind v4)
- [x] Test pyramid wired: Vitest + RTL (unit/component), Playwright (e2e, mobile-emulated)
- [x] `/api/health` server boundary; mobile-first viewport; clean landing page (not a blank screen)
- [x] lint + typecheck + unit + e2e all green
- [x] Deployed to Vercel → https://skelar-todoist.vercel.app/
- [x] Vercel CLI installed (via pnpm) and on PATH; `vercel link` connected to the
  existing `skelar-todoist` project (fixed an initial mislink that created a stray
  duplicate project — deleted, verified no impact on the real project)
- [x] `vercel env pull` working (`.env.local`, gitignored)
- [x] `AI_API_KEY`, `MVP_USERNAME`, `MVP_PASSWORD` set on Vercel (Sensitive,
  Production + Preview) **and** manually added to local `.env.local` (Option A
  from "local secrets access" — pasted directly, since Sensitive vars can't be
  pulled via CLI for Development by design). Local dev has everything it needs.
- [x] CI/CD model decided: **Option A** (Vercel Git integration + branch
  protection on `main`) — see "Key decisions made"
- [x] GitHub Actions workflow (`.github/workflows/ci.yml`: lint + typecheck +
  unit + e2e) runs on PRs into `main` and pushes to `main`; e2e runs against a
  local `next dev` server in CI (no Vercel preview wiring needed since the gate
  lives on the PR, independent of the deploy)
- [x] Branch protection on `main`: PRs required (no direct pushes, no force
  push, no deletion), `test` CI check required, 0 mandatory reviewers (solo
  project)
- [x] **Phase 1 — product spec brainstormed** ([PRODUCT.md](./PRODUCT.md)): locked the
  `Task` schema (UI↔AI contract), Today-vs-Inbox routing, priority (default-off), deadline
  badge, ordering, tags, the Capture → Review → Save flow + add-model + parse rules, empty
  states, completion model, and the **access / onboarding / freemium** design (3-rung
  ladder, Edge Config `freeDailyInputs`, voice fake-door + waitlist). §18 (open decisions)
  is empty.
- [x] **All core-screen layouts mocked** in [docs/mockups/](./mockups/) — Capture (+ voice
  sheets), Review (+ edge cases), task editor, New-task entry, Today, Inbox, empty states.
  Mobile-first, borderless **pill** tab bar. Welcome / Plans / Settings specified (§12/§14),
  mockups optional.
- [x] **Core-flow implementation plan written** (writing-plans skill) →
  [docs/superpowers/plans/2026-07-20-core-flow.md](./superpowers/plans/2026-07-20-core-flow.md).
  19 bite-sized TDD tasks in 2 deployable milestones: **A** = manual-planner substrate
  (model → storage → Today/Inbox → editor), **B** = AI capture (parser → `/api/organize` →
  Capture → Review → deterministic e2e). Milestone C (edge/empty/onboarding) + Plan 2
  (auth/freemium/voice) outlined for later.
- [x] **Phase 2 — core flow implemented** (subagent-driven TDD, branch `feat/core-flow`, 31
  commits). Milestone A: Task model + `createTask`, injectable clock + deadline/do-date
  formatting, Today/Inbox routing + ordering/grouping, swappable `TaskStore`
  (localStorage/memory), `TaskStoreProvider` + `useTasks` (SSR-safe hydration,
  functional-update commit), design tokens + app shell + landing redirect, `TaskRow` +
  display primitives, shared `TaskEditorSheet`, Today + Inbox screens. Milestone B: zod parse
  contract + `TaskParser` interface + prompt, deterministic `FakeTaskParser` + golden dataset,
  real `GatewayTaskParser` (AI SDK v7 + Vercel AI Gateway, OIDC), `POST /api/organize` with
  Edge-Config `aiMode` (fake/real) + server-only guard, `organize()` client wrapper, Capture
  composer + Review flow, deterministic Playwright e2e of the graded scenario. Whole-branch
  review passed (merge-with-small-fixes: Inbox §11 Completed toggle, 44px touch targets,
  `.env.example` refresh, hermetic e2e). Non-blocking follow-ups tracked in
  `.superpowers/sdd/progress.md`.

## Next (in order)
1. **Merge PR #7** (issue #4 P1 + provider switch; branch protection requires the CI `test` gate).
   Then in the Vercel dashboard set Edge Config `aiModel = anthropic/claude-haiku-4.5` to run on the
   Anthropic account (`AI_API_KEY` already set; no redeploy) and smoke-test the live flow. Instant
   revert: `aiModel = openai/gpt-4o-mini`, or `aiMode = fake`. (`aiMode = "real"` is already set in prod.)
2. **Issue #4 P2/P3** — flow-UX (Start-over keeps text, whole-card edit, placement-pill affordance,
   persist Completed toggle) + the Tabler-icon pass (tab bar, mic, wand, help). Next coding session.
3. **Dayspark brand UI/UX** — implement the approved spec (PR #6): brand/logo, wordmark, OG image,
   favicons, PWA manifest, metadata.
4. **Milestone C** — needs-a-date (the additive `needsDate` flag), first-run onboarding
   (`hasOrganizedOnce`), exact empty-state copy, quick-add AI entry points, plus the deferred
   robustness items (client-tz `today` into `/api/organize`, empty-parse-result UX,
   deadline-badge tone) tracked in `.superpowers/sdd/progress.md`.
5. **Plan 2** — access ladder, freemium metering, Plans/Settings/Welcome, voice fake-door.

## Open decisions
- **(Optional, low priority) Mock-AI fallback for local dev.** Once the AI route
  handler exists, consider having it fall back to a canned response when no key
  is present — reduces API costs while iterating and removes the key dependency
  for most local UI work. Not needed now since the real key is already available
  locally (see "Done").

## Key decisions made
- Stack: Next.js 16 App Router + React 19 + Tailwind v4.
- Testing: **Vitest** (not Jest) for unit/component; **Playwright** for e2e — a unit
  runner can't test async Server Components or the full flow.
- Playwright config reads `BASE_URL` so CI can point e2e at a Vercel preview URL.
- Committed permission allowlist lives in `.claude/settings.json`; personal overrides
  in gitignored `.claude/settings.local.json`.
- Default branch renamed `master` → `main`.
- **CI/CD: Option A** — Vercel's Git integration auto-deploys (preview per
  branch/PR, production on push to `main`); the test gate lives on the *merge*
  via GitHub branch protection, not inside the deploy itself. Chosen over
  Option B (CI-owned `vercel deploy --prebuilt`) for lower setup cost on a solo
  project; A→B migration stays cheap later if needed.
- Package manager for global CLI tools: **pnpm** (project deps still use npm,
  per `package-lock.json`).
- **Product decisions live in [PRODUCT.md](./PRODUCT.md)** — the groomed spec is the source
  of truth for the Task schema, screens, routing, priority, freemium, and onboarding.
- **Edge Config** created + linked in Vercel with key `freeDailyInputs = 3` (free daily AI
  limit; runtime-tunable without redeploy, fallback constant `3`).
- **AI integration: Vercel AI SDK (`ai`) + AI Gateway**, model **`openai/gpt-4o-mini`**,
  structured output enforced by a `zod` contract schema. Behind a `TaskParser` interface.
  **Gateway is Vercel-managed (OIDC auth)** — zero token markup, $5/mo free credits, no
  provider key to manage; auth via `VERCEL_OIDC_TOKEN` (`vercel env pull` locally, automatic
  on deploys). The `AI_API_KEY` (Anthropic) **is** used for parsing — but only on the direct
  `anthropic/*` path (see the provider switch below), not the default gateway path.
  - **Model switched from `anthropic/claude-haiku-4.5` → `openai/gpt-4o-mini`** (issue #4 P1):
    Haiku is gated on the Gateway **free tier** (`403 RestrictedModelsError`); gpt-4o-mini is
    available. gpt-4o-mini's **strict** structured outputs reject optional keys, so the model
    output uses a required-but-nullable schema (`modelTaskSchema`) distinct from the lenient
    validation schema; `createTask` normalizes the nulls with `??`. **Note:** the free tier also
    **rate-limits** gpt-4o-mini under bursts (`GatewayRateLimitError`) — fine for single-user
    demo taps, and covered by the fallback below regardless.
  - **Runtime provider/model switch (issue #4):** Edge Config `aiModel`
    (`Edge Config → env AI_MODEL → default openai/gpt-4o-mini`) picks the real-mode model.
    `anthropic/*` runs on the user's **own Anthropic account** via the **direct
    `@ai-sdk/anthropic` SDK** (`AI_API_KEY`), bypassing the Vercel gateway. _Gateway BYOK was
    tried first but proved **paid-tier only** ("BYOK is available only with paid credits"), so
    it is not viable on the free tier — hence the direct SDK._ Other slugs stay on the managed
    gateway (free credits). **Verified: eval 5/5** on both `anthropic/claude-haiku-4.5` (direct)
    and `openai/gpt-4o-mini` (gateway). Prod: set `aiModel = anthropic/claude-haiku-4.5`.
  - **Resilience (issue #4 P1):** if the real parser fails for any reason (gateway/model/
    rate-limit/timeout), `/api/organize` **falls back to `FakeTaskParser`** and returns
    `{ tasks, degraded: true }`; the Review screen shows an honest "AI temporarily unavailable —
    organized with a basic parser" notice instead of the old misleading 502 "Try rephrasing".
- **Dual-mode parsing via Edge Config `aiMode` (`fake`|`real`)** — a deterministic rule-based
  `FakeTaskParser` (local dev, tests, and an instant grading fallback) vs the real
  `GatewayTaskParser`. Resolution: Edge Config `aiMode` → env `AI_MODE` → default `fake`;
  prod sets `real`. Fake mode makes the full-flow e2e run with **no API key**.
- **Prompt evaluation via a golden dataset** (`src/lib/ai/fixtures/parseCases.ts`): shared
  invariants drive deterministic Vitest snapshots of the fake parser **and** an opt-in
  `npm run eval:ai` that checks the real model. Added deps (at build time): `ai`, `zod`, `tsx`.
- **One additive schema field** planned: `needsDate?: boolean` (optional, zero-migration) for
  the Inbox "Needs a date" section — the locked §3 `Task` schema otherwise can't distinguish
  ambiguous-undated from Someday backlog.
