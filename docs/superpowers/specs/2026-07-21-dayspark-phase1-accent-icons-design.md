# Design — Dayspark UI Phase 1: coral accent + Tabler icons + light composer polish

> **Status: approved (brainstorm, 2026-07-21).** Next: turn into a TDD implementation plan
> (writing-plans skill), land the design package as a docs-only PR, then build subagent-driven
> on a fresh branch. Builds on **Phase 0** (brand assets, merged PR #12) and the
> [redesign roadmap](./2026-07-21-dayspark-ui-redesign-roadmap.md) (this is roadmap **Phase 1**).

## 1. Goal

Phase 0 gave the app a brand (name, logo, share image, favicon, metadata) but the **in-app UI still
predates it**: a lone blue accent (`#1f6fd0`) and a few leftover emoji/text glyphs. Phase 1 aligns
the running product with the Dayspark identity — **without** destabilising the working core flow —
by making **coral the single accent**, finishing the **Tabler-icon** adoption app-wide, and adding
**light** brand polish to the Capture composer. The bigger per-screen "moments" (chaos→clarity
reveal, empty-state redesigns, motion) are explicitly **deferred to Phase 2/3**.

## 2. Decisions (locked in the brainstorm)

- **One warm accent — blue is retired.** Coral becomes the sole accent; the blue tokens are
  redefined (not kept as a secondary).
- **Accessibility is a hard requirement.** Every accent text/icon/button must meet **WCAG AA**
  (4.5:1 for normal text, 3:1 for large text / non-text UI). This drove the two-coral split below.
- **Two corals:**
  - **Bright brand coral `#FF6A3D` — decorative only** (wordmark "spark", the mark, gradients,
    the OG/badge art). It is ~2.8:1 as text on white, so it is **never** used for functional text
    or as a white-text button fill.
  - **Functional deep coral `#C2410C`** — the accent for text, icons, the active tab, links, and
    primary button fills. AA-verified (see §4).
- **Coral is reserved for meaning:** primary CTAs (Plan it, Add tasks), the active tab, and AI
  moments. **Minor controls** that are blue today (the **Show-completed** toggles, the editor
  **"Done"** action) become **neutral** (ink/secondary), so coral keeps its punch and the UI stays
  calm.
- **Typography unchanged:** keep **Geist**; no display font (a roadmap Phase 3 "delight" item).
- **Scope:** palette swap + Tabler icons app-wide + light composer polish. Out of scope this phase:
  per-screen "moment" redesigns, empty-state redesigns, and motion/micro-animation (Phase 2/3).

## 3. Architecture / approach

**Token-first, minimal-diff.** The app is already fully token-driven: every blue accent flows
through `--color-fill-accent` / `--color-text-accent` / `--color-bg-accent` / `--color-on-accent`,
and the only raw blue hexes live in `src/app/globals.css`. So the accent swap is largely a
**redefinition of those token values in one file** — the ~9 component call sites recolor
automatically. This is a deliberate rejection of a broader "coral scale" refactor (YAGNI): we change
token *values*, keep the token *names* and the component code.

The icon work is a bounded set of glyph→Tabler substitutions in four components, following the
established Phase-3 pattern (`@tabler/icons-react`, `aria-hidden` on the glyph, the accessible name
carried by adjacent text or an explicit `aria-label`).

## 4. Palette — the coral accent system (deterministic, AA-verified)

Redefine these tokens in `src/app/globals.css` (the planner `@theme` block). Existing surface,
text, warning, and danger tokens are **unchanged**; the Phase-0 brand tokens (`--color-brand-*`)
stay for decorative use.

| Token | Current (blue) | **New (coral)** | Used by | Contrast (AA) |
|---|---|---|---|---|
| `--color-fill-accent` | `#1f6fd0` | **`#c2410c`** | primary buttons (Plan it, Add tasks) | white text on it **5.18:1** ✓ |
| `--color-text-accent` | `#185fa5` | **`#c2410c`** | accent text/icons, **active tab**, links | on white **5.18:1** ✓ · on cream `surface-1` **4.63:1** ✓ |
| `--color-bg-accent` | `#e6f1fb` | **`#fbe9e1`** | soft accent chip bg (voice-icon circle) | deep-coral icon on it **4.40:1** ✓ (icon = non-text, needs 3:1) |
| `--color-on-accent` | `#ffffff` | `#ffffff` *(unchanged)* | text/icon on coral fills | ✓ |

Contrast figures are computed against the actual surfaces the tokens appear on
(`surface-1` = `#f4f2ec`, `surface-2` = `#ffffff`). All accent **text** usages clear 4.5:1; the
`bg-accent` chip carries only an **icon** (non-text), which needs 3:1 and clears it at 4.40:1.

**Kept, decorative only** (from Phase 0, unchanged): `--color-brand-gold #ffb43c`,
`--color-brand-coral #ff6a3d`, `--color-brand-coral-deep #ff5e5e`, `--color-brand-cream #fdf8ee`,
plus `BRAND.goldMark #ffc24b`. These render the wordmark, mark, and gradients — **not** functional
text or buttons.

> The exact deep-coral value (`#c2410c`) is confirmed at implementation time with a contrast check;
> a redder alternative `#c4432a` (~5.0:1) was considered and set aside in favour of the safer margin.

## 5. Iconography — finish Tabler app-wide

Convert the remaining emoji/text glyphs to `@tabler/icons-react`, matching the Phase-3 pattern
(icon `aria-hidden`, accessible name preserved via adjacent text or `aria-label`; ~15–20px sizes to
match existing usage):

| File | Glyph today | → Tabler | Notes |
|---|---|---|---|
| `ReviewScreen.tsx` | `✕` (remove) | `IconX` | keep the per-task `aria-label` (e.g. "Remove {title}") |
| `ReviewScreen.tsx` | `☀ Today` / `📥 Inbox` (placement pill) | `IconSun` / `IconInbox` + keep the word | pill still reads as a ⇄ toggle |
| `ReviewScreen.tsx` | `⇄` (swap indicator) | `IconArrowsExchange` | the P3 code comment already planned this |
| `ReviewScreen.tsx` | `☀` / `📥` (section count headers) | `IconSun` / `IconInbox` | "Today · N" / "Inbox · N" |
| `TaskRow.tsx` | `✓` (done state) | `IconCheck` | inside the existing complete-toggle |
| `TaskRow.tsx` | `→` (move target) | `IconArrowRight` | already used in CaptureFlow |
| `PriorityFlag.tsx` | `⚑` | `IconFlagFilled` | keep the priority `aria-label` |
| `TaskEditorSheet.tsx` | `✕` (close) | `IconX` | keep `aria-label="Close"` |

The tab bar (bulb/sun/inbox) and the Capture composer (wand, help-circle, mic, arrow) already use
Tabler (Phase 3) — their **active/accent color** simply follows the new coral `text-accent`.

## 6. Light composer polish (Capture)

Minimal, brand-signalling touches — not a Capture redesign:

- **Plan it** becomes the coral CTA automatically (it uses `fill-accent`), **plus a spark glyph**
  on the AI action to signal "AI". Use **`IconSparkles`** in `on-accent` (white) — it reads cleanly
  on the coral fill and matches the Tabler set already on the composer; the gradient `DaysparkMark`
  is reserved for non-button AI moments where a small colored mark works. (Replaces the current
  `IconArrowRight`; keep the button text "Plan it".)
- "Try an example" (wand) and the active tab now read coral via the token swap.
- No new layout, no parsing animation, no empty-state redesign (Phase 2/3).

## 7. Testing (proportionate)

- **Component (Vitest/RTL):** for each changed icon, assert the Tabler `<svg>` is present and
  `aria-hidden`, and that the control's **accessible name is preserved** (existing name-based
  queries like `getByRole("button", { name: /remove/i })` must still pass). Update the few tests
  that assert on a literal glyph (`✓`, `✕`) to assert on the icon + name instead.
- **Token smoke (Vitest):** a small test asserting the accent tokens resolve to the coral values
  (guards an accidental revert to blue) — or assert no `#1f6fd0`/`#185fa5` remains in `globals.css`.
- **e2e (Playwright):** the existing specs must stay green; optionally assert the active tab / a
  primary CTA carries the accent. No new brittle color assertions.
- **Contrast:** captured as the §4 table (source of truth) and eyeballed on the PR's Vercel preview.
- Full sweep green before merge: `lint && typecheck && test && test:e2e`.

## 8. Files affected

- `src/app/globals.css` — redefine the 4 accent tokens (§4).
- `src/components/screens/ReviewScreen.tsx` (+ test) — icons (§5).
- `src/components/task/TaskRow.tsx` (+ test) — `IconCheck`, `IconArrowRight`.
- `src/components/task/PriorityFlag.tsx` (+ test) — `IconFlagFilled`.
- `src/components/task/TaskEditorSheet.tsx` (+ test) — `IconX`; "Done" → neutral.
- `src/components/screens/InboxScreen.tsx` / `TodayScreen.tsx` — Show-completed toggle → neutral.
- `src/components/screens/CaptureFlow.tsx` (+ test) — Plan it spark glyph.
- `src/components/nav/TabBar.tsx` — **no code change**: active tab already uses `text-accent`, so it
  recolors to coral via the token swap; verify visually only.
- (No changes to storage, AI, routing, or the Task schema.)

## 9. Out of scope (Phase 2/3, per roadmap)

Capture/Review "moment" reveals ("N sorted into your day"), empty-state redesigns, sun/spark
micro-animations, an optional display font, and raster 192/512 PWA icons. Milestone C (onboarding /
needs-a-date) remains independent.

## 10. Risks / notes

- **Contrast regressions elsewhere:** only the accent tokens change; warning/danger/surfaces are
  untouched, so the blast radius is the accent call sites. Verify each on the preview.
- **Icon accessible names:** the top risk is dropping an accessible name when swapping a glyph for an
  icon — the tests in §7 guard exactly this.
- **`text-accent` on `bg-accent`:** only ever an icon (voice chip); do not place small accent text on
  `bg-accent` (it's 4.40:1 — fine for icons, under 4.5 for small text).
