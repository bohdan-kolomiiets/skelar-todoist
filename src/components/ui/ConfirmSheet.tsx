"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";

/** Shared base for the two equal-width action buttons (≥44px touch target). */
const btn = "min-h-11 flex-1 rounded-xl text-[15px] font-medium";

interface Props {
  open: boolean;
  /** Question/heading, also the dialog's accessible name — e.g. "Remove this task?". */
  title: string;
  /** Optional context line under the title — e.g. the task's name. */
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Style the confirm action as destructive (danger tokens) instead of accent. */
  destructive?: boolean;
  onConfirm(): void;
  /** Fired by the Cancel button and by backdrop tap / Escape (via BottomSheet). */
  onCancel(): void;
}

/**
 * A lightweight yes/no confirmation, built on the shared BottomSheet (backdrop tap,
 * Escape, focus and dialog semantics come for free). Guards accidental destructive
 * actions — e.g. removing a task on Review.
 */
export function ConfirmSheet({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <BottomSheet open={open} onClose={onCancel} ariaLabel={title}>
      <h2 className="text-lg font-medium">{title}</h2>
      {description && <p className="mt-1 text-[13px] text-text-secondary">{description}</p>}
      <div className="mt-5 flex gap-2.5">
        <button type="button" onClick={onCancel} className={`${btn} border border-border bg-surface-1 text-text-secondary`}>
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={destructive ? `${btn} border border-border-danger bg-bg-danger text-text-danger` : `${btn} bg-fill-accent text-on-accent`}
        >
          {confirmLabel}
        </button>
      </div>
    </BottomSheet>
  );
}
