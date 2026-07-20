const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Whole-day difference b - a, both "YYYY-MM-DD", via UTC to avoid DST drift. */
function dayDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const ta = Date.UTC(ay, am - 1, ad);
  const tb = Date.UTC(by, bm - 1, bd);
  return Math.round((tb - ta) / 86_400_000);
}

function absolute(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

export type BadgeTone = "normal" | "warning" | "danger";

/** Deadline badge label + tone (PRODUCT §6). */
export function deadlineBadge(deadline: string, today: string): { label: string; tone: BadgeTone } {
  const diff = dayDiff(today, deadline); // >0 future, 0 today, <0 past
  if (diff < 0) {
    const n = Math.abs(diff);
    return { label: n === 1 ? "due 1 day ago" : `due ${n} days ago`, tone: "danger" };
  }
  if (diff === 0) return { label: "due today", tone: "warning" };
  if (diff === 1) return { label: "due tomorrow", tone: "warning" };
  if (diff <= 7) return { label: `due in ${diff} days`, tone: "warning" };
  return { label: `due ${absolute(deadline)}`, tone: "normal" };
}

/** Short do-date label for Inbox scheduled badges (PRODUCT §7). */
export function formatDoDate(doDate: string, today: string): string {
  const diff = dayDiff(today, doDate);
  if (diff === 1) return "tomorrow";
  if (diff > 1 && diff <= 6) {
    const [y, m, d] = doDate.split("-").map(Number);
    return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  }
  return absolute(doDate);
}
