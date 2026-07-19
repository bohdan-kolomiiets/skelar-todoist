# AI Day Planner — Project Guide

Mobile-first AI day planner (Todoist-style). Core flow: **brain dump (text, later
voice) → AI structures it into tasks (priority, time, deadline) → a "Today" plan.**
This is the graded MVP scenario and must work end-to-end.

## Read these first
- **[docs/PROGRESS.md](./docs/PROGRESS.md)** — current status, what's next, open
  decisions. **Start here every session.**
- **[docs/PRODUCT.md](./docs/PRODUCT.md)** — groomed spec: `Task` schema + screens.
  _(pending the brainstorm)_
- **[docs/BRIEF.md](./docs/BRIEF.md)** — original raw requirements + grading criteria.
- **[README.md](./README.md)** — dev commands + architecture.

## Stack
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Vitest + RTL
(unit/component) · Playwright (e2e). Deployed on Vercel.

## Commands
See README "Development". Before calling anything done, run the sweep:
`npm run lint && npm run typecheck && npm test && npm run test:e2e`

## Non-negotiable conventions
- **Secrets stay server-side** — the AI key lives only in `src/app/api/*` route
  handlers, never in client/browser/git.
- **Storage & auth are swappable** — MVP uses `localStorage` / no-real-auth behind
  small interfaces in `src/lib`, so a real backend/DB can replace the implementation
  without touching UI.
- **Test pyramid + TDD** — unit (Vitest) for logic, component (RTL), e2e (Playwright)
  for the full flow. Mock the LLM at the boundary in unit/integration tests.
- **KISS / YAGNI / SOLID / DRY** — add abstractions when a real need appears, not upfront.
- **Mobile-first** — large touch targets, one-handed use, nothing desktop-only.

## Deployment
- Production: https://skelar-todoist.vercel.app/
- Vercel Git integration (auto-deploys on push). CI/CD test gate: **TBD** — see
  PROGRESS "Open decisions".
