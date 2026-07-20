# Progress Log

> Living status for the project. **Update at the end of each working session** —
> move items from Next → Done, record new decisions, note the next concrete step.
>
> Last updated: 2026-07-20

## Current phase
Phase 1 (product spec / brainstorm) **complete**; **implementation plan for the core flow
written** → [docs/superpowers/plans/2026-07-20-core-flow.md](./superpowers/plans/2026-07-20-core-flow.md)
(19 bite-sized TDD tasks, 2 deployable milestones). Next: **Phase 2 — execute the plan**,
starting with Milestone A (the manual-planner substrate), one vertical slice at a time.

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

## Next (in order)
1. **Phase 2 — execute the core-flow plan**, Milestone A first (Tasks 1–11 → deployable
   manual planner), then Milestone B (Tasks 12–19 → graded AI flow). TDD, one slice at a
   time. Execution mode TBD (subagent-driven vs inline).
2. **Milestone C** — needs-a-date, first-run onboarding, exact empty-state copy, quick-add
   AI entry points (polish on the working core).
3. **Plan 2** — access ladder, freemium metering, Plans/Settings/Welcome, voice fake-door.

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
- **AI integration: Vercel AI SDK (`ai`) + AI Gateway**, model `anthropic/claude-haiku-4.5`,
  structured output enforced by a `zod` contract schema. Behind a `TaskParser` interface.
  **Gateway is Vercel-managed (OIDC auth)** — zero token markup, $5/mo free credits, no
  provider key to manage; auth via `VERCEL_OIDC_TOKEN` (`vercel env pull` locally, automatic
  on deploys). The earlier `AI_API_KEY` is **no longer used** for parsing (candidate to retire).
  Haiku ≈ $1/M in, $5/M out → ~0.2¢ per brain-dump parse.
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
