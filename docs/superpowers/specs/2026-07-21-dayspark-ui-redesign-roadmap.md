# Dayspark — UI/UX redesign roadmap (future)

> **Status: roadmap / vision — not scheduled.** Execute phase by phase later; each
> phase gets its own brainstorm → plan (writing-plans) → implementation when picked up.
> Builds on the brand: spec [`2026-07-21-dayspark-brand-share-icon-design.md`](./2026-07-21-dayspark-brand-share-icon-design.md)
> and assets in [`docs/brand/`](../../brand/).

## Why

The app now has a brand — **Dayspark**, a spark logo, a **sunrise gold→coral**
palette, and a bright-yet-calm personality (*brain-dump the chaos → the clear light
of a planned day*). Today's UI predates it: muted cream surfaces, a lone blue
accent (`#1f6fd0`), and emoji controls. This roadmap aligns the product's look and
feel with the brand — done gradually, without destabilising the working core flow.

## Design language

- **Bright & warm.** Sunrise gold→coral is the signature. The calm cream base stays
  (it *is* the "clarity"); warmth is the accent and the emotional lift — don't tint
  everything orange.
- **Clarity is the feeling.** The UI should dramatise chaos→order: Capture feels
  open and inviting; Review feels like a satisfying sort into a bright plan.
- **The spark ✨ is the AI glyph.** Every AI moment (Plan it, Try an example,
  parsing, success) carries the spark. The sun stays the "Today" motif.
- **Mobile-first, large targets, one-handed** — unchanged.

## Palette application (the key decision)

Current: cream surfaces + blue accent. Proposed:

- **Brand coral (`#FF6A3D`) becomes the primary accent** — key actions (Plan it,
  active tab, primary buttons, links) and AI moments; gold for spark/sun highlights.
- **Blue** → retired, or demoted to a quiet secondary. *(Open question.)*
- Warning amber / danger red stay (already warm-adjacent, on-brand).
- Keep the calm cream base; add warmth through accents, the spark, and select
  gradients only.

## Motif & iconography

- Adopt **Tabler icons** app-wide (bulb/sun/inbox tabs, help-circle Tips, microphone,
  wand) — already tracked in issue #4 (P3); fold it in here.
- The **spark** recurs as an accent (primary buttons, the parsing state, empty states).

## Per-screen direction

- **Capture — the brand moment.** Dayspark wordmark header; warm, inviting composer;
  Plan it as a coral CTA with a spark; "Try an example" with the wand/spark; a
  parsing state that animates a spark; a bright, welcoming empty state.
- **Today.** Sun motif in the header; warm progress line; priority flag / deadline
  badges are already warm.
- **Inbox.** Inbox motif; clear scheduled/someday grouping.
- **Review — the payoff.** Lean into the chaos→clarity reveal: bright section headers
  (sun/inbox), a satisfying "N sorted into your day."
- **Editor / rows / chips.** Consistent warm accents — coral for primary, cream/neutral
  for the rest.
- **Tab bar.** Tabler icons + active state in brand coral.

## Typography (optional)

Consider a slightly more characterful **display face** for the wordmark/headers
(keeping Geist for body copy) to give the brand more personality. *Open question.*

## Motion / delight (later)

Restrained sunrise/spark micro-animations for AI moments (a parsing shimmer, a
plan-it success spark) — subtle, mobile-friendly.

## Phasing

- **Phase 0 (now):** brand assets — the approved brand spec (logo, share image,
  favicon, icons, metadata, wordmark header).
- **Phase 1:** accent/palette swap (coral primary) + Tabler icons app-wide + composer
  polish. *(Overlaps issue #4 P2/P3.)*
- **Phase 2:** per-screen brand polish (Capture moment, Review reveal, empty states).
- **Phase 3:** motion & delight; optional display font.

## Open questions

- How warm to go: calm-cream-with-coral-accent (recommended) vs. a warmer overall surface?
- Retire the blue accent, or keep it as a quiet secondary?
- Add a display font for the wordmark/headers?

## Relationship to other tracked work

- **Brand spec** (Phase 0): `2026-07-21-dayspark-brand-share-icon-design.md`.
- **Core-flow fixes** (issue #4): its P3 (Tabler icons, composer polish, touch targets)
  folds into Phase 1 here; the P1 AI-model decision is independent.
- **Milestone C** ([`docs/PROGRESS.md`](../../PROGRESS.md)): onboarding / empty-state work —
  coordinate with Phase 2's empty-state polish.
