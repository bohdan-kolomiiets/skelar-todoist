"use client";

import { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  onClose(): void;
  /** Accessible name for the dialog. */
  ariaLabel: string;
  children: React.ReactNode;
}

/**
 * Bottom-anchored modal sheet (grab handle + dimmed backdrop). Closes on backdrop
 * tap or Escape. A shared primitive for lightweight info sheets (Tips, voice
 * teaser); the full-screen task editor stays separate.
 */
export function BottomSheet({ open, onClose, ariaLabel, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus the panel once per open transition. Keyed on `open` alone — depending
  // on `onClose` (often a fresh closure each render) would re-run this on every
  // parent re-render and yank focus off an input mid-typing (see QuickAddSheet).
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-black/30"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className="relative z-10 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-surface-2 px-5 pb-6 pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] outline-none"
      >
        <div aria-hidden className="mx-auto mb-3 h-1 w-9 rounded-full bg-border-strong" />
        {children}
      </div>
    </div>
  );
}
