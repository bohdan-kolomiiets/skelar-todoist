"use client";

import { useState } from "react";

interface Props {
  onSubmit(emailOrName: string): void;
  submitLabel?: string;
  autoFocus?: boolean;
}

/** Fake passwordless sign-in: one field (email or name), no password (PRODUCT §12). */
export function SignInForm({ onSubmit, submitLabel = "Save my plan", autoFocus = false }: Props) {
  const [value, setValue] = useState("");
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const v = value.trim();
        if (v) onSubmit(v);
      }}
    >
      <input
        aria-label="Email or name"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Email or name"
        className="min-h-11 rounded-lg border border-border bg-surface-2 px-3 text-base outline-none"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="min-h-11 rounded-full bg-fill-accent px-4 text-[15px] font-medium text-on-accent disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </form>
  );
}
