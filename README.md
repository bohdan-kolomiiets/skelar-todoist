# todoist

Mobile-first AI day planner. Brain dump (text/voice) → AI structures it into
tasks (priority, time, deadline) → a Today plan.

- Product spec: [docs/PRODUCT.md](./docs/PRODUCT.md)
- Original raw brief: [docs/BRIEF.md](./docs/BRIEF.md)

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** — mobile-first styling
- **Vitest** + **React Testing Library** — unit/component tests (base of the pyramid)
- **Playwright** — e2e tests (real browser, mobile-emulated)

## Development

First-time setup (already done in this repo; needed only on a fresh clone):

```bash
npm install                     # install dependencies
npx playwright install chromium # install the e2e browser (one time)
```

### Run the app locally

```bash
npm run dev     # dev server with hot-reload → http://localhost:3000
npm run build   # production build
npm start       # serve the production build → http://localhost:3000
```

### Run tests

```bash
npm test            # unit/component tests once (Vitest) — what CI runs
npm run test:watch  # unit tests, re-run on change (TDD)
npm run test:e2e    # e2e (Playwright starts/stops the dev server for you)
npm run test:e2e:ui # e2e in the interactive UI (step through, debug)
```

### Check code quality

```bash
npm run lint       # ESLint — style/quality issues
npm run typecheck  # TypeScript type errors (tsc --noEmit)
```

### The "is everything OK?" sweep

Same checks CI runs — if all pass, the change is in good shape:

```bash
npm run lint && npm run typecheck && npm test && npm run test:e2e
```

## Architecture

Kept intentionally minimal. Seams are established and documented so the product
can grow without rework; abstractions are added when a real need appears (YAGNI),
not upfront.

```
src/
  app/            # routes (App Router)
    api/          # Route Handlers = the SERVER boundary.
                  # Secrets (AI key) and backend calls live here, never client-side.
  lib/            # framework-agnostic helpers and, later, domain + storage
  components/     # shared UI (added as screens are built)
```

Key seams for what's coming (see [docs/BRIEF.md](./docs/BRIEF.md)):

- **Secrets stay server-side.** The AI parsing call goes through `src/app/api/`,
  reading `AI_API_KEY` from server env — never exposed to the browser.
- **Storage is swappable.** MVP persists client state in `localStorage`; it will
  sit behind a small interface in `src/lib` so a real backend/DB can replace the
  implementation later without touching UI.
- **Auth is swappable.** MVP has no real auth; the same interface approach keeps
  a future backend swap isolated.

Deferred to the product brainstorm (`docs/PRODUCT.md`), **not** scaffolded yet:
the `Task` data schema (the core UI↔AI contract) and the Capture / Inbox / Today
screens.

