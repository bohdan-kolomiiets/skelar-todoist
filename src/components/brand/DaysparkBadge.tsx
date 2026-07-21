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
