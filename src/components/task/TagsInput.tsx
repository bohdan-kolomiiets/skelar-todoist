"use client";

import { useState } from "react";
import { Chip } from "./Chip";

export function TagsInput({ value, onChange }: { value: string[]; onChange(next: string[]): void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const tag = draft.trim().toLowerCase();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {value.map((t) => (
        <Chip key={t}>{t}</Chip>
      ))}
      <input
        aria-label="Add tag"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        placeholder="+ add"
        className="min-w-16 flex-1 bg-transparent text-sm outline-none"
      />
    </div>
  );
}
