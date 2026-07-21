import type { ParsedTask } from "@/lib/task/types";

export interface OrganizeResult {
  tasks: ParsedTask[];
  /** True when the server fell back to the deterministic parser (real AI was unavailable). */
  degraded: boolean;
  /** Free-tier daily AI-input allowance, echoed from the boundary (client defaults to 3). */
  freeDailyInputs: number;
}

/** Client-side call to the parse boundary. UI never imports the parsers directly. */
export async function organize(text: string): Promise<OrganizeResult> {
  const res = await fetch("/api/organize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong. Please try again.");
  return {
    tasks: (json.tasks ?? []) as ParsedTask[],
    degraded: Boolean(json.degraded),
    freeDailyInputs: typeof json.freeDailyInputs === "number" ? json.freeDailyInputs : 3,
  };
}
