import type { TimeOfDay } from "@/lib/task/types";
import { Chip } from "./Chip";

export function TimeOfDayChip({ value }: { value: TimeOfDay }) {
  return <Chip>{value}</Chip>;
}
