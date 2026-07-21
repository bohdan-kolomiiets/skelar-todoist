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

/**
 * Soft warm glow bleeding out of the bottom-right corner of the share card.
 * Mirrors docs/brand/dayspark-og.svg's `dayspark-og-glow` radial gradient: a
 * circle of r=300 centered at (1080, 600) on the 1200×630 canvas, i.e. a
 * 600×600 box whose right/bottom edges sit 180px/270px past the card's edges.
 * Must be painted first (Satori paints in source order) so content layers on top.
 */
function Glow() {
  return (
    <div
      style={{
        position: "absolute",
        display: "flex",
        width: 600,
        height: 600,
        right: -180,
        bottom: -270,
        borderRadius: "50%",
        background:
          "radial-gradient(circle at center, rgba(255,122,69,0.18), rgba(255,122,69,0) 70%)",
      }}
    />
  );
}

/** 1200×630 shared-link card. */
export function renderShareCard() {
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 56,
          padding: "0 96px",
          background: "#F4F2EC",
        }}
      >
        <Glow />
        <Badge size={300} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 118, fontWeight: 800, letterSpacing: -3, color: BRAND.ink }}>
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
