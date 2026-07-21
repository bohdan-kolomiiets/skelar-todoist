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
