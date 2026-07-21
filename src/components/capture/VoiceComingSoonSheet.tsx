"use client";

import { IconMicrophone } from "@tabler/icons-react";
import { BottomSheet } from "@/components/ui/BottomSheet";

/**
 * Voice fake-door (PRODUCT §16) — the minimal "coming soon" teaser. The "Notify me"
 * waitlist, its email field, and the already-subscribed edge case are deferred (Plan 2).
 */
export function VoiceComingSoonSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  return (
    <BottomSheet open={open} onClose={onClose} ariaLabel="Voice capture">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bg-accent text-text-accent">
          <IconMicrophone size={20} aria-hidden />
        </span>
        <div>
          <p className="text-[15px] font-medium">Talk instead of type</p>
          <p className="text-[13px] text-text-secondary">Voice capture — coming soon.</p>
        </div>
      </div>
      <p className="mt-3 text-[13px] text-text-secondary">
        We&rsquo;re building hands-free brain dumps. For now, jot it down and I&rsquo;ll sort it out.
      </p>
    </BottomSheet>
  );
}
