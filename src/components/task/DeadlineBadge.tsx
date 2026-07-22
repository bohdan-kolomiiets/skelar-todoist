import { deadlineBadge } from "@/lib/date/format";
import { Chip } from "./Chip";

export function DeadlineBadge({ deadline, today }: { deadline: string; today: string }) {
  const { label, tone } = deadlineBadge(deadline, today);
  return <Chip tone={tone}>{label}</Chip>;
}
