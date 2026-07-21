import { useId } from "react";
import { SPARK_PATH, BRAND } from "./shapes";

/** The Dayspark spark mark (goldMark→coral). Flexible standalone logo. */
export function DaysparkMark({ size = 24, title = "Dayspark" }: { size?: number; title?: string }) {
  const gid = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={title}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={BRAND.goldMark} />
          <stop offset="1" stopColor={BRAND.coral} />
        </linearGradient>
      </defs>
      <path fill={`url(#${gid})`} transform="translate(14,22) scale(2.667)" d={SPARK_PATH} />
      <path fill={`url(#${gid})`} transform="translate(63,15) scale(0.917)" d={SPARK_PATH} />
    </svg>
  );
}
