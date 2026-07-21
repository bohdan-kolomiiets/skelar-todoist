"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";

// Parser-accurate cues (see src/lib/ai/prompt.ts). Deliberately omits relative
// offsets like "in 5 days", which the model doesn't infer yet (see PROGRESS "Parked").
const CUES: Array<[string, string]> = [
  ["When", '"today", "tomorrow", or a weekday ("Friday") sets the day. Leave it out and it waits in your Inbox.'],
  ["Time", '"3pm", or a part of day like "this morning" / "tonight".'],
  ["Deadline", '"due Friday", "by Monday" — shown as a due badge, separate from the day you’ll do it.'],
  ["Priority", '"urgent", "important", or "ASAP" flags it as important.'],
  ["Tags", 'topical words like "work", "health", "errand" become tags.'],
  ["Someday", '"someday" or no date keeps it as backlog in your Inbox.'],
];

export function TipsSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  return (
    <BottomSheet open={open} onClose={onClose} ariaLabel="How I read your dump">
      <h2 className="text-lg font-medium">How I read your dump</h2>
      <p className="mt-1 text-[13px] text-text-secondary">
        Write naturally — one line each, or all run together. Here&rsquo;s what I pick up:
      </p>
      <dl className="mt-3 flex flex-col gap-2.5">
        {CUES.map(([term, desc]) => (
          <div key={term}>
            <dt className="text-[15px] font-medium">{term}</dt>
            <dd className="text-[13px] text-text-secondary">{desc}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-[13px] text-text-secondary">
        Not sure about a date? Say it however you like — I won&rsquo;t guess, and you can set it in Review.
      </p>
    </BottomSheet>
  );
}
