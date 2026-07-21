# Design — Dayspark brand + shareable link icon

> **Status: approved (brainstorm, 2026-07-21).** Next: turn into an implementation plan
> (writing-plans skill). Source of truth for the brand assets and the share/icon surfaces.

## 1. Goal

When the app URL is shared in a message, the preview is text-only (no image) — because the
site ships no Open Graph image. This work gives the product a **brand identity (name + logo
+ palette)** and renders it everywhere the app appears: the **shared-link preview image**,
the **browser-tab favicon**, the **iOS/Android home-screen icon**, and the **in-app header**.

## 2. Brand decisions (locked)

- **Name:** **Dayspark** — *day* (the existing sun / "Today" motif) + *spark* (the jolt of
  clarity; also echoes the ✨ "AI spark" already in the composer).
- **Mark:** a **four-point spark** (the ✨ / "auto-awesome" sparkle) rendered as a small sun.
- **App icon:** the spark **knocked out of a warm rounded "badge" tile** — bold and legible
  at 16 px. (Chosen direction: *Spark mark + badge icon*.)
- **Wordmark:** `Day` in ink + `spark` in coral, weight ~800, tracking ≈ −0.02em, system/Geist sans.
- **Palette — sunrise gold → coral** (new brand tokens, coexisting with the existing muted
  warm surfaces):
  | Token | Value | Use |
  |---|---|---|
  | `--color-brand-gold` | `#FFB43C` | gradient start |
  | `--color-brand-coral` | `#FF6A3D` | wordmark "spark", accents, theme color |
  | `--color-brand-coral-deep` | `#FF5E5E` | badge gradient end |
  | `--color-brand-cream` | `#FDF8EE` | spark knockout on the badge |
  | (existing) `--color-text-primary` | `#2B2A27` | wordmark "Day" |

## 3. Surfaces & scope

| Surface | Asset | Source |
|---|---|---|
| Shared-link preview (OG) | `opengraph-image` 1200×630 PNG + `twitter-image` | `next/og` |
| Browser tab | `icon.svg` (badge) — replaces scaffold `favicon.ico` | static SVG |
| iOS home screen | `apple-icon` 180×180 PNG | `next/og` |
| Android / PWA | `manifest.webmanifest` + 192 & 512 PNG icons, name, theme color | `manifest.ts` + `next/og` |
| Page metadata | title, description, `openGraph`, `twitter`, `metadataBase`, theme color | `layout.tsx` |
| In-app header | Dayspark wordmark on the **Capture** screen (the mockup's "Your AI Planner" slot) | `<Wordmark/>` component |

Out of scope: animated logo, marketing site/copy, dark-mode-specific brand variants (the warm
mark reads on both), renaming the Vercel project/repo.

## 4. Architecture / approach

**One source of truth for the mark.** The design-source SVGs are saved in
[`docs/brand/`](../../brand/) (`dayspark-mark`, `-badge`, `-wordmark`, `-og`). A small brand
module — `src/components/brand/` — mirrors them as React SVG components: `Mark` (the spark),
`Badge` (spark-in-tile), and `Wordmark` (Badge/Mark + "Dayspark"). The in-app header consumes
these directly, and the same JSX/SVG feeds `next/og` — so the icons and share image can never
drift from the in-app logo.

**Image generation via `next/og` + Next file conventions.** No hand-exported PNGs to
maintain:
- `src/app/opengraph-image.tsx` → `ImageResponse` (1200×630) rendering the share card; `alt` set.
- `src/app/twitter-image.tsx` → re-uses the same renderer.
- `src/app/apple-icon.tsx` → `ImageResponse` (180×180) rendering the Badge.
- `src/app/icon.svg` → the Badge as a static SVG (modern browsers use it as the favicon).
- `src/app/manifest.ts` → name "Dayspark", `short_name` "Dayspark", `theme_color` = brand
  coral, `background_color` = cream, and 192/512 icons (generated Badge PNGs).
- **Remove** `src/app/favicon.ico` (else it overrides `icon.svg`).

**Metadata (`src/app/layout.tsx`).**
- `metadataBase: new URL("https://skelar-todoist.vercel.app")` — so `og:image` resolves to an
  absolute URL (required by Telegram/Slack/etc.).
- `title: "Dayspark — AI day planner"`, `description: "Brain-dump your day. AI turns the chaos into a clear plan."`
- `openGraph`: `siteName: "Dayspark"`, `type: "website"`, title, description (image auto-wired by the file convention).
- `twitter`: `card: "summary_large_image"`, title, description.
- `viewport.themeColor`: brand coral (light) — matches the warm identity.
- `appleWebApp.title: "Dayspark"`.

**Brand tokens** added to `src/app/globals.css` (§2 table). The rest of the app UI is
unchanged; only the Capture header wordmark and any brand accents are introduced.

## 5. Visual spec (deterministic)

- **Spark path** (24×24 box): `M12 0 C12 6 18 12 24 12 C18 12 12 18 12 24 C12 18 6 12 0 12 C6 12 12 6 12 0 Z`.
- **Badge:** rounded square, corner radius ≈ 24% of side; fill = linear gradient
  `--color-brand-gold → --color-brand-coral-deep` (diagonal top-left→bottom-right); a
  `--color-brand-cream` spark centered at ≈ 48% of the tile.
- **Standalone Mark** (on light/in wordmark): the spark filled with `#FFC24B → #FF6A3D`
  (gold→coral), optional small companion spark top-right for larger sizes.
- **Wordmark:** `Day` `#2B2A27` + `spark` `#FF6A3D`, weight 800, tracking −0.02em.
- **OG card (1200×630):** background `#F4F2EC` (cream); soft warm radial glow bottom-right;
  Badge ≈ 280 px at the left, vertically centered; wordmark ≈ 120 px + two-line tagline
  ≈ 33 px to its right. Alt: *"Dayspark — brain-dump your day, and AI turns the chaos into a clear plan."*

## 6. Testing (proportionate)

- **Component (Vitest/RTL):** `Mark`/`Badge`/`Wordmark` render — assert the "Dayspark" text
  and an `<svg>` are present; the badge exposes an accessible label.
- **Metadata (Vitest):** import the `layout.tsx` `metadata`/`viewport` exports and assert
  title, description, `metadataBase`, `openGraph`, and `twitter.card` are set as specified.
- **Routes (Playwright e2e):** `GET /opengraph-image`, `/icon.svg`, `/apple-icon`,
  `/manifest.webmanifest` return 200 with the right content-type (image/PNG, SVG, JSON); the
  landing HTML includes `<meta property="og:image">`, `<meta name="twitter:card">`, and a
  `rel="icon"`. (`next/og` routes render real images — verify at the HTTP boundary, not in unit tests.)

## 7. Caveats / open items (resolve at plan/impl time)

- **`next/og` fonts:** Satori needs font data for text. Bundle a weight (Geist/Inter) for the
  OG wordmark + tagline. **Robust fallback:** render the wordmark as **outlined SVG paths**
  in the OG image so no font loading is required. Verify the `next/og` API against the
  installed Next 16 at implementation time (as we did for the AI SDK).
- **Icon PNG sizes** (apple 180, manifest 192/512): generated via `next/og` — no manual export.
- **Trademark/domain:** "Dayspark" — the user should do a quick trademark + domain/handle check
  before public marketing. Not a blocker for shipping the app assets.
- The warm brand tokens are additive; existing muted surfaces and the blue accent stay.
