import { cn } from "@/lib/cn";

export function Chip({ children, tone = "normal" }: { children: React.ReactNode; tone?: "normal" | "warning" | "danger" }) {
  const tones = {
    normal: "bg-surface-1 text-text-secondary border-border",
    warning: "bg-bg-warning text-text-warning border-border-warning",
    danger: "bg-bg-danger text-text-danger border-border-danger",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs", tones[tone])}>
      {children}
    </span>
  );
}
