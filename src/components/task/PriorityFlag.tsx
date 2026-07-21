import { IconFlagFilled } from "@tabler/icons-react";

export function PriorityFlag() {
  return (
    <span aria-label="High priority" title="High priority" className="inline-flex text-text-danger">
      <IconFlagFilled size={15} aria-hidden />
    </span>
  );
}
