# Progress Log

> Living status for the project. **Update at the end of each working session** —
> move items from Next → Done, record new decisions, note the next concrete step.
>
> Last updated: 2026-07-20

## Current phase
Phase 1 (product spec / brainstorm) **complete** — [PRODUCT.md](./PRODUCT.md) is fully
groomed (Task schema + AI contract, all core screens, access / onboarding / freemium), with
low-fi mockups in [mockups/](./mockups/) and every open decision closed. Next: write the
implementation plan, then Phase 2 (build the core flow end-to-end, TDD).

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

## Next (in order)
1. **Write the implementation plan** from [PRODUCT.md](./PRODUCT.md) (use the
   writing-plans skill) — sequence the vertical slices before touching code.
2. **Phase 2 — build the core flow end-to-end** (Capture → AI parse → Review → Today),
   TDD, one vertical slice at a time. Suggested order: `Task` model + swappable storage
   interface → mock-LLM parse boundary (`/api/organize`) → Capture/Review → Today/Inbox →
   editor → auth/freemium shell.

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
