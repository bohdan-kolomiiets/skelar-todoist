import type { ParsedTask } from "@/lib/task/types";

/** Client-side call to the parse boundary. UI never imports the parsers directly. */
export async function organize(text: string): Promise<ParsedTask[]> {
  const res = await fetch("/api/organize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong. Please try again.");
  return json.tasks as ParsedTask[];
}
