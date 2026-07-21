"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { SignInForm } from "./SignInForm";

interface Props {
  open: boolean;
  onClose(): void;
  onSignIn(emailOrName: string): void;
}

/** Guest→Free conversion moment (PRODUCT §12): non-blocking, dismissible. */
export function SaveNudgeSheet({ open, onClose, onSignIn }: Props) {
  return (
    <BottomSheet open={open} onClose={onClose} ariaLabel="Save your plan">
      <h2 className="text-lg font-medium">Keep this plan?</h2>
      <p className="mt-1 text-text-secondary">Sign in to save it — so you don’t lose it.</p>
      <div className="mt-4">
        <SignInForm autoFocus onSubmit={onSignIn} />
      </div>
      <button type="button" onClick={onClose} className="mt-3 min-h-11 w-full text-[15px] text-text-secondary">
        Continue as guest
      </button>
    </BottomSheet>
  );
}
