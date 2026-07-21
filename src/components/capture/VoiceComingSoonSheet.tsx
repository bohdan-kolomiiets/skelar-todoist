"use client";

import { useMemo, useState } from "react";
import { IconMicrophone, IconCheck } from "@tabler/icons-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useAuth } from "@/lib/auth/useAuth";
import { LocalWaitlistService } from "@/lib/waitlist/LocalWaitlistService";

/**
 * Voice fake-door (PRODUCT §16) — a real demand test. Tapping the mic offers a
 * "Notify me" waitlist (signed-in = one tap; guest = email field) and, once joined,
 * shows "You're on the list". No email is ever sent; joining is not registration.
 */
export function VoiceComingSoonSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const { profile } = useAuth();
  const waitlist = useMemo(() => new LocalWaitlistService(), []);
  // Seed from storage each time the sheet mounts/opens; local state flips on join.
  const [joined, setJoined] = useState(() => waitlist.hasJoined("voice"));
  const [email, setEmail] = useState("");
  const knownEmail = profile?.email ?? "";

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    waitlist.join({ email: trimmed, feature: "voice", userId: profile?.id });
    setJoined(true);
  };

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

      {joined ? (
        <p className="mt-4 flex items-center gap-2 text-[15px] text-text-primary">
          <IconCheck size={18} className="text-text-accent" aria-hidden />
          You&rsquo;re on the list — we&rsquo;ll let you know when voice lands.
        </p>
      ) : knownEmail ? (
        <div className="mt-4">
          <p className="text-[13px] text-text-secondary">Want a heads-up when it&rsquo;s ready?</p>
          <button
            type="button"
            onClick={() => submit(knownEmail)}
            className="mt-2 min-h-11 rounded-full bg-fill-accent px-4 text-[15px] font-medium text-on-accent"
          >
            Notify me
          </button>
        </div>
      ) : (
        <form
          className="mt-4 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit(email);
          }}
        >
          <p className="text-[13px] text-text-secondary">Want a heads-up when it&rsquo;s ready?</p>
          <input
            aria-label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="min-h-11 rounded-lg border border-border bg-surface-2 px-3 text-base outline-none"
          />
          <button
            type="submit"
            disabled={!email.trim()}
            className="min-h-11 rounded-full bg-fill-accent px-4 text-[15px] font-medium text-on-accent disabled:opacity-50"
          >
            Notify me
          </button>
        </form>
      )}
    </BottomSheet>
  );
}
