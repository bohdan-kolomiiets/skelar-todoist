# Dayspark — brand assets (design source)

The single visual source of truth for the Dayspark identity. The **shipped**
favicon / Apple touch / Open Graph / PWA-manifest assets are **generated from
these** at build time via `next/og` + Next's file conventions (see the design
spec) — so the icons and share image can't drift from the logo. Edit the design
here, never the generated output.

| File | What it is |
|---|---|
| `dayspark-mark.svg` | The spark mark (gold→coral) — the flexible logo. |
| `dayspark-badge.svg` | The app icon — spark knocked out of a warm rounded tile. |
| `dayspark-wordmark.svg` | Mark + "Dayspark" lockup (Day = ink · spark = coral). |
| `dayspark-og.svg` | The 1200×630 shared-link (Open Graph) card design. |

**Palette:** gold `#FFB43C` · coral `#FF6A3D` · coral-deep `#FF5E5E` · cream
`#FDF8EE` · ink `#2B2A27`.
**Spark path** (24-box): `M12 0 C12 6 18 12 24 12 C18 12 12 18 12 24 C12 18 6 12 0 12 C6 12 12 6 12 0 Z`.

> The wordmark & OG SVGs use a **system font** for their text as a *reference*.
> Production should outline the text (or bundle a font) for portability — see the
> spec's §7 caveats.

- Design spec: [`../superpowers/specs/2026-07-21-dayspark-brand-share-icon-design.md`](../superpowers/specs/2026-07-21-dayspark-brand-share-icon-design.md)
- Redesign roadmap: [`../superpowers/specs/2026-07-21-dayspark-ui-redesign-roadmap.md`](../superpowers/specs/2026-07-21-dayspark-ui-redesign-roadmap.md)
