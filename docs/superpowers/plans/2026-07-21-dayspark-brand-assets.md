# Dayspark Brand Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Brand the app as **Dayspark** and render its identity everywhere it appears — a shared-link (Open Graph) image, favicon, Apple touch + PWA icons, page metadata, and an in-app wordmark — all from one source mark.

**Architecture:** A small brand module (`src/components/brand/`) defines the spark mark, the warm badge, and the wordmark as React SVG components from a single `SPARK_PATH` constant. The in-app header consumes them directly; the generated assets (share image, Apple icon) are produced at request time by Next's `next/og` `ImageResponse` from the same shapes; the favicon is a static SVG of the badge. Metadata and a web manifest wire it all up.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · `next/og` (bundled `ImageResponse`, ships Geist as the default font) · Vitest + RTL (unit/component) · Playwright (e2e).

## Global Constraints

_Every task's requirements implicitly include this section. Values copied verbatim from the design spec (`docs/superpowers/specs/2026-07-21-dayspark-brand-share-icon-design.md`) and `docs/brand/`._

- **Name:** **Dayspark**. Wordmark: `Day` in ink `#2B2A27` + `spark` in coral `#FF6A3D`.
- **Brand palette (new, additive tokens):** gold `#FFB43C`, coral `#FF6A3D`, coral-deep `#FF5E5E`, cream `#FDF8EE`. Existing ink `#2B2A27`.
- **Spark path (24×24 box):** `M12 0 C12 6 18 12 24 12 C18 12 12 18 12 24 C12 18 6 12 0 12 C6 12 12 6 12 0 Z`
- **Badge:** rounded square, `rx` ≈ 22% of side; fill = linear gradient gold→coral-deep (diagonal); a cream spark centered at ≈ 48% of the tile.
- **OG card (1200×630):** cream `#F4F2EC` background, soft warm glow bottom-right, badge ≈ 280 px left/centered, wordmark + two-line tagline right. Tagline: **"Brain-dump your day. AI turns the chaos into a clear plan."** Alt: *"Dayspark — brain-dump your day, and AI turns the chaos into a clear plan."*
- **Metadata:** title `Dayspark — AI day planner`; description = the tagline; `metadataBase = https://skelar-todoist.vercel.app`; theme color = coral `#FF6A3D`.
- **`next/og`:** import `ImageResponse` from `next/og`. It ships **Geist Regular** as the default font — do NOT bundle a font. Render the badge as a CSS-gradient `<div>` containing an `<img>` of the spark (data URI) — Satori rasterizes SVG shapes/gradients fine; only avoid relying on non-default font weights.
- **Secrets/none:** this feature touches no secrets. **Mobile-first**, existing muted surfaces and blue accent stay unchanged (brand tokens are additive). **KISS / YAGNI / TDD.**
- **Design source of truth:** the SVGs in `docs/brand/` (`dayspark-mark`, `-badge`, `-wordmark`, `-og`). The React components and generated assets must match them.
- **Verify at implementation time:** the exact `next/og` `ImageResponse` options and the Next metadata-file conventions (`opengraph-image`, `twitter-image`, `icon`, `apple-icon`, `manifest`) against the installed Next 16 before finalizing each route.

---

## File Structure

**Brand module (`src/components/brand/`):**
- `shapes.ts` — the shared `SPARK_PATH` constant + brand color constants.
- `DaysparkMark.tsx` — the spark mark (gradient), React SVG.
- `DaysparkBadge.tsx` — the app-icon badge (warm tile + cream spark), React SVG.
- `DaysparkWordmark.tsx` — mark + "Dayspark" lockup.

**App / metadata (`src/app/`):**
- `globals.css` — append brand color tokens.
- `metadata.ts` — the `metadata` + `viewport` config, in a plain module (no `next/font`/CSS imports) so it's unit-testable; `layout.tsx` re-exports it.
- `layout.tsx` — re-export the metadata/viewport config.
- `icon.svg` — static favicon (the badge). Remove `favicon.ico`.
- `manifest.ts` — web app manifest.
- `opengraph-image.tsx` — the 1200×630 share card (`next/og`).
- `twitter-image.tsx` — re-uses the OG renderer.
- `apple-icon.tsx` — 180×180 badge (`next/og`).
- `og-image.tsx` (helper, `src/app/_brand/`) — shared JSX + spark/badge data-URI helpers for the image routes (DRY across opengraph/twitter/apple).

**UI:**
- `src/components/screens/CaptureFlow.tsx` — add the Dayspark wordmark header.

**Tests:**
- `src/components/brand/DaysparkBrand.test.tsx` — component render tests.
- `src/app/layout.metadata.test.ts` — metadata assertions.
- `src/components/screens/CaptureFlow.test.tsx` — extend for the header.
- `e2e/brand.spec.ts` — routes + `<head>` meta tags.

---

## Task 1: Brand tokens + brand SVG components

**Files:**
- Modify: `src/app/globals.css` (append brand tokens)
- Create: `src/components/brand/shapes.ts`
- Create: `src/components/brand/DaysparkMark.tsx`
- Create: `src/components/brand/DaysparkBadge.tsx`
- Create: `src/components/brand/DaysparkWordmark.tsx`
- Test: `src/components/brand/DaysparkBrand.test.tsx`

**Interfaces:**
- Produces: `SPARK_PATH: string`; `BRAND` color constants; `DaysparkMark({ size?, title? })`, `DaysparkBadge({ size?, title? })`, `DaysparkWordmark({ size?, className? })` — all render an accessible `<svg role="img" aria-label="Dayspark">`.

- [ ] **Step 1: Append brand tokens to `globals.css`**

Add below the existing planner `@theme { … }` block:

```css
/* Dayspark brand palette (docs/brand). Additive; existing surfaces unchanged. */
@theme {
  --color-brand-gold: #ffb43c;
  --color-brand-coral: #ff6a3d;
  --color-brand-coral-deep: #ff5e5e;
  --color-brand-cream: #fdf8ee;
}
```

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/brand/DaysparkBrand.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DaysparkMark } from "./DaysparkMark";
import { DaysparkBadge } from "./DaysparkBadge";
import { DaysparkWordmark } from "./DaysparkWordmark";

describe("Dayspark brand components", () => {
  it("mark renders an accessible svg", () => {
    render(<DaysparkMark />);
    expect(screen.getByRole("img", { name: /dayspark/i })).toBeInTheDocument();
  });

  it("badge renders an accessible svg", () => {
    render(<DaysparkBadge />);
    expect(screen.getByRole("img", { name: /dayspark/i })).toBeInTheDocument();
  });

  it("wordmark shows the Dayspark text and a mark", () => {
    const { container } = render(<DaysparkWordmark />);
    expect(screen.getByText("Day")).toBeInTheDocument();
    expect(screen.getByText("spark")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/components/brand/DaysparkBrand.test.tsx`
Expected: FAIL — `Cannot find module './DaysparkMark'`.

- [ ] **Step 4: Write the shapes + components**

```ts
// src/components/brand/shapes.ts
/** The four-point "spark" glyph, drawn in a 24×24 box (Dayspark mark). */
export const SPARK_PATH =
  "M12 0 C12 6 18 12 24 12 C18 12 12 18 12 24 C12 18 6 12 0 12 C6 12 12 6 12 0 Z";

export const BRAND = {
  gold: "#FFB43C",
  coral: "#FF6A3D",
  coralDeep: "#FF5E5E",
  cream: "#FDF8EE",
  ink: "#2B2A27",
} as const;
```

```tsx
// src/components/brand/DaysparkMark.tsx
import { useId } from "react";
import { SPARK_PATH, BRAND } from "./shapes";

/** The Dayspark spark mark (gold→coral). Flexible standalone logo. */
export function DaysparkMark({ size = 24, title = "Dayspark" }: { size?: number; title?: string }) {
  const gid = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={title}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={BRAND.gold} />
          <stop offset="1" stopColor={BRAND.coral} />
        </linearGradient>
      </defs>
      <path fill={`url(#${gid})`} transform="translate(14,22) scale(2.667)" d={SPARK_PATH} />
      <path fill={`url(#${gid})`} transform="translate(63,15) scale(0.917)" d={SPARK_PATH} />
    </svg>
  );
}
```

```tsx
// src/components/brand/DaysparkBadge.tsx
import { useId } from "react";
import { SPARK_PATH, BRAND } from "./shapes";

/** The Dayspark app icon: a cream spark on a warm rounded tile. */
export function DaysparkBadge({ size = 48, title = "Dayspark" }: { size?: number; title?: string }) {
  const gid = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={title}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={BRAND.gold} />
          <stop offset="1" stopColor={BRAND.coralDeep} />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="96" height="96" rx="22" fill={`url(#${gid})`} />
      <path fill={BRAND.cream} transform="translate(26,26) scale(2)" d={SPARK_PATH} />
    </svg>
  );
}
```

```tsx
// src/components/brand/DaysparkWordmark.tsx
import { DaysparkMark } from "./DaysparkMark";
import { BRAND } from "./shapes";

/** Mark + "Dayspark" lockup (Day = ink, spark = coral). */
export function DaysparkWordmark({ size = 26, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <DaysparkMark size={size} title="" />
      <span className="text-[19px] font-extrabold tracking-tight" style={{ color: BRAND.ink }}>
        Day<span style={{ color: BRAND.coral }}>spark</span>
      </span>
    </span>
  );
}
```

> Note: `DaysparkMark title=""` inside the wordmark suppresses its own label so the visible "Dayspark" text is the accessible name of the lockup; the standalone `DaysparkMark`/`DaysparkBadge` keep `aria-label="Dayspark"`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/components/brand/DaysparkBrand.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Sweep + commit**

Run: `npm run lint && npm run typecheck && npm test`
Expected: all green.

```bash
git add src/app/globals.css src/components/brand/
git commit -m "feat(brand): Dayspark brand tokens + mark/badge/wordmark components"
```

---

## Task 2: Dayspark wordmark on the Capture header

**Files:**
- Modify: `src/components/screens/CaptureFlow.tsx`
- Test: `src/components/screens/CaptureFlow.test.tsx` (extend)

**Interfaces:**
- Consumes: `DaysparkWordmark` (Task 1).

- [ ] **Step 1: Add the failing assertion to the Capture test**

Append to `src/components/screens/CaptureFlow.test.tsx`'s `describe("CaptureFlow", …)`:

```tsx
  it("shows the Dayspark wordmark header", () => {
    renderFlow();
    expect(screen.getByText("Day")).toBeInTheDocument();
    expect(screen.getByText("spark")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/screens/CaptureFlow.test.tsx`
Expected: FAIL — "Day"/"spark" not found.

- [ ] **Step 3: Add the wordmark header to `CaptureFlow`**

Import at the top of `src/components/screens/CaptureFlow.tsx`:

```tsx
import { DaysparkWordmark } from "@/components/brand/DaysparkWordmark";
```

In the returned composer `<section>`, add a header as the first child (above the composer `<div>`):

```tsx
<header className="flex items-center pb-1">
  <DaysparkWordmark />
</header>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/screens/CaptureFlow.test.tsx`
Expected: PASS (existing tests + the new one).

- [ ] **Step 5: Sweep + commit**

Run: `npm run lint && npm run typecheck && npm test`

```bash
git add src/components/screens/CaptureFlow.tsx src/components/screens/CaptureFlow.test.tsx
git commit -m "feat(brand): Dayspark wordmark on the Capture header"
```

---

## Task 3: Metadata + favicon + web manifest

**Files:**
- Create: `src/app/metadata.ts`
- Modify: `src/app/layout.tsx`
- Create: `src/app/icon.svg`
- Delete: `src/app/favicon.ico`
- Create: `src/app/manifest.ts`
- Test: `src/app/metadata.test.ts`

**Interfaces:**
- Produces: `daysparkMetadata: Metadata`, `daysparkViewport: Viewport` (re-exported by `layout.tsx` as `metadata`/`viewport`); `/icon.svg`; `/manifest.webmanifest`.

- [ ] **Step 1: Write the failing metadata test**

```ts
// src/app/metadata.test.ts
import { describe, it, expect } from "vitest";
import { daysparkMetadata as metadata, daysparkViewport as viewport } from "./metadata";

describe("root metadata", () => {
  it("carries the Dayspark title, description, and metadataBase", () => {
    expect(metadata.title).toBe("Dayspark — AI day planner");
    expect(String(metadata.description)).toMatch(/chaos into a clear plan/i);
    expect(String(metadata.metadataBase)).toContain("skelar-todoist.vercel.app");
  });

  it("declares Open Graph and a summary_large_image Twitter card", () => {
    expect(metadata.openGraph?.title).toMatch(/dayspark/i);
    expect((metadata.twitter as { card?: string })?.card).toBe("summary_large_image");
  });

  it("sets the brand theme color", () => {
    expect(JSON.stringify(viewport.themeColor)).toContain("#FF6A3D".toLowerCase());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/metadata.test.ts`
Expected: FAIL — `Cannot find module './metadata'`.

- [ ] **Step 3: Create `metadata.ts` and re-export it from `layout.tsx`**

Create the plain, testable config module (no `next/font`/CSS imports):

```ts
// src/app/metadata.ts
import type { Metadata, Viewport } from "next";

export const daysparkMetadata: Metadata = {
  metadataBase: new URL("https://skelar-todoist.vercel.app"),
  title: "Dayspark — AI day planner",
  description: "Brain-dump your day. AI turns the chaos into a clear plan.",
  applicationName: "Dayspark",
  appleWebApp: { capable: true, title: "Dayspark", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    siteName: "Dayspark",
    title: "Dayspark — your AI day planner",
    description: "Brain-dump your day. AI turns the chaos into a clear plan.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dayspark — your AI day planner",
    description: "Brain-dump your day. AI turns the chaos into a clear plan.",
  },
};

export const daysparkViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ff6a3d",
};
```

In `src/app/layout.tsx`, replace the existing inline `metadata`/`viewport` exports with re-exports of the config (Next statically reads these named `const` exports). Add near the top:

```tsx
import { daysparkMetadata, daysparkViewport } from "./metadata";
```

and replace the old `export const metadata …` / `export const viewport …` blocks with:

```tsx
export const metadata = daysparkMetadata;
export const viewport = daysparkViewport;
```

(Remove the now-unused `Metadata`/`Viewport` type imports from `layout.tsx`. `openGraph.images`/`twitter.images` are auto-wired by the `opengraph-image.tsx`/`twitter-image.tsx` files in Task 4 — do not hardcode them.)

- [ ] **Step 4: Create the favicon and remove the scaffold `.ico`**

Create `src/app/icon.svg` with the badge (copy of `docs/brand/dayspark-badge.svg`):

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Dayspark">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFB43C"/><stop offset="1" stop-color="#FF5E5E"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="96" height="96" rx="22" fill="url(#g)"/>
  <path fill="#FDF8EE" transform="translate(26,26) scale(2)" d="M12 0 C12 6 18 12 24 12 C18 12 12 18 12 24 C12 18 6 12 0 12 C6 12 12 6 12 0 Z"/>
</svg>
```

```bash
git rm src/app/favicon.ico
```

- [ ] **Step 5: Create the web manifest**

```ts
// src/app/manifest.ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dayspark",
    short_name: "Dayspark",
    description: "Brain-dump your day. AI turns the chaos into a clear plan.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f2ec",
    theme_color: "#ff6a3d",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
```

> The 180×180 `/apple-icon` PNG is created in Task 4. (Raster 192/512 maskable PNGs are a later enhancement if strict Android installability is needed — not required for the MVP.)

- [ ] **Step 6: Run test + sweep**

Run: `npm test -- src/app/metadata.test.ts && npm run lint && npm run typecheck`
Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/metadata.ts src/app/layout.tsx src/app/icon.svg src/app/manifest.ts src/app/metadata.test.ts
git rm --cached src/app/favicon.ico 2>/dev/null || true
git commit -m "feat(brand): Dayspark metadata, SVG favicon, web manifest"
```

---

## Task 4: Share image + Twitter card + Apple icon (`next/og`)

**Files:**
- Create: `src/app/_brand/ogImage.tsx` (shared renderer + data-URI helpers)
- Create: `src/app/opengraph-image.tsx`
- Create: `src/app/twitter-image.tsx`
- Create: `src/app/apple-icon.tsx`

**Interfaces:**
- Consumes: `SPARK_PATH`, `BRAND` (Task 1).
- Produces: `renderShareCard(): ImageResponse` and `renderBadge(size): ImageResponse`; the three image routes.

> Verify `ImageResponse` import + options against the installed `next/og` first (Next 16 ships Geist as the default font — no `fonts` option needed). Render the badge as a CSS-gradient `<div>` wrapping an `<img>` of the spark data URI; Satori rasterizes it via resvg.

- [ ] **Step 1: Write the shared renderer**

```tsx
// src/app/_brand/ogImage.tsx
import { ImageResponse } from "next/og";
import { SPARK_PATH, BRAND } from "@/components/brand/shapes";

/** A data-URI <img> of the cream spark (no font needed; resvg rasterizes it). */
function sparkImg(px: number) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='${BRAND.cream}' d='${SPARK_PATH}'/></svg>`;
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  // eslint-disable-next-line @next/next/no-img-element
  return <img width={px} height={px} src={src} alt="" />;
}

function Badge({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${BRAND.gold}, ${BRAND.coralDeep})`,
      }}
    >
      {sparkImg(Math.round(size * 0.48))}
    </div>
  );
}

/** 1200×630 shared-link card. */
export function renderShareCard() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", gap: 56, padding: "0 96px", background: "#F4F2EC" }}>
        <Badge size={300} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 118, fontWeight: 800, letterSpacing: -3, color: BRAND.ink }}>
            Day<span style={{ color: BRAND.coral }}>spark</span>
          </div>
          <div style={{ fontSize: 34, color: "#5F5E5A", marginTop: 8 }}>Brain-dump your day.</div>
          <div style={{ fontSize: 34, color: "#5F5E5A" }}>AI turns the chaos into a clear plan.</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

/** Square badge PNG (e.g. Apple touch icon). */
export function renderBadge(size: number) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#F4F2EC" }}>
        <Badge size={size} />
      </div>
    ),
    { width: size, height: size },
  );
}
```

- [ ] **Step 2: Write the three route files**

```tsx
// src/app/opengraph-image.tsx
import { renderShareCard } from "./_brand/ogImage";

export const alt = "Dayspark — brain-dump your day, and AI turns the chaos into a clear plan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return renderShareCard();
}
```

```tsx
// src/app/twitter-image.tsx
export { default, alt, size, contentType } from "./opengraph-image";
```

```tsx
// src/app/apple-icon.tsx
import { renderBadge } from "./_brand/ogImage";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return renderBadge(180);
}
```

- [ ] **Step 3: Verify the routes render (manual, dev server)**

Run: `npm run dev`, then in another shell:
```bash
curl -sI http://localhost:3000/opengraph-image | grep -i content-type   # image/png
curl -sI http://localhost:3000/apple-icon | grep -i content-type        # image/png
```
Expected: both `content-type: image/png`. (Open `/opengraph-image` in a browser to eyeball the card matches `docs/brand/dayspark-og.svg`.) Stop the dev server.

- [ ] **Step 4: Sweep + commit**

Run: `npm run lint && npm run typecheck && npm test`
Expected: all green (these routes have no unit tests; they're covered by the e2e in Task 5).

```bash
git add src/app/_brand/ogImage.tsx src/app/opengraph-image.tsx src/app/twitter-image.tsx src/app/apple-icon.tsx
git commit -m "feat(brand): next/og share image, Twitter card, and Apple icon"
```

---

## Task 5: End-to-end brand verification + full sweep

**Files:**
- Create: `e2e/brand.spec.ts`

**Interfaces:**
- Consumes: the running app (Playwright `webServer`, `npm run dev`).

- [ ] **Step 1: Write the e2e spec**

```ts
// e2e/brand.spec.ts
import { test, expect } from "@playwright/test";

test("brand assets are served with the right content types", async ({ request }) => {
  const og = await request.get("/opengraph-image");
  expect(og.ok()).toBeTruthy();
  expect(og.headers()["content-type"]).toContain("image/png");

  const apple = await request.get("/apple-icon");
  expect(apple.ok()).toBeTruthy();
  expect(apple.headers()["content-type"]).toContain("image/png");

  const icon = await request.get("/icon.svg");
  expect(icon.ok()).toBeTruthy();
  expect(icon.headers()["content-type"]).toContain("image/svg+xml");

  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  expect(await manifest.json()).toMatchObject({ name: "Dayspark" });
});

test("the page head wires up the Dayspark brand", async ({ page }) => {
  await page.goto("/capture");
  await expect(page.locator('head meta[property="og:image"]')).toHaveCount(1);
  await expect(page.locator('head meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  await expect(page.locator('head link[rel="icon"]')).toHaveCount(1);
  await expect(page.locator('head link[rel="manifest"]')).toHaveCount(1);
  // the in-app wordmark
  await expect(page.getByText("spark")).toBeVisible();
});
```

- [ ] **Step 2: Run the full sweep**

Run: `npm run lint && npm run typecheck && npm test && npm run test:e2e`
Expected: all green. (The e2e boots `npm run dev`; the brand routes render via `next/og`.)

- [ ] **Step 3: Commit + deploy note**

```bash
git add e2e/brand.spec.ts
git commit -m "test(brand): e2e for share image, icons, manifest, and head meta"
```

> **Deploy note.** On merge, Vercel auto-deploys. Verify the live share preview by pasting `https://skelar-todoist.vercel.app/` into a Telegram/Slack chat (or the [opengraph.xyz](https://www.opengraph.xyz/) debugger) — the warm Dayspark card should appear. Social platforms cache previews; use the debugger to force a re-scrape if an old text-only preview is cached.

---

## What comes after this plan

- **Raster 192/512 maskable PWA icons** (if strict Android installability is wanted) — generate via `next/og` `generateImageMetadata`, reference in `manifest.ts`.
- **Dayspark UI/UX redesign** — see `docs/superpowers/specs/2026-07-21-dayspark-ui-redesign-roadmap.md` (Phase 1+): coral as the primary accent, Tabler icons app-wide, per-screen brand polish. Overlaps issue #4.

---

## Self-review (completed while writing)

- **Spec coverage.** Brand tokens + mark/badge/wordmark (spec §2/§5 → Task 1), in-app wordmark (§3 → Task 2), metadata + favicon + manifest (§3/§4 → Task 3), OG/Twitter/Apple images via `next/og` (§3/§4 → Task 4), tests incl. routes + head meta (§6 → Tasks 1–5). Out-of-scope items (raster PWA icons, redesign) named at the end, not dropped.
- **Placeholder scan.** No TBDs; every code step has complete code; every command has expected output.
- **Type consistency.** `SPARK_PATH`/`BRAND` defined once (Task 1) and consumed by the components and the `next/og` renderer; component prop names (`size`, `title`, `className`) consistent; the `/apple-icon` path referenced by `manifest.ts` (Task 3) is produced by `apple-icon.tsx` (Task 4).
- **Verified before writing:** `next/og` exists in Next 16 and ships Geist as the default font (no font bundling); the badge renders font-free as a CSS gradient + spark `<img>`; metadata file conventions are standard Next 16. Each image route still says to re-verify `ImageResponse` options at implementation time.
