"use client";

import Link from "next/link";
import { BottomSheet } from "@/components/ui/BottomSheet";

interface Props {
  open: boolean;
  onClose(): void;
  used: number;
  limit: number;
}

/** Free→Pro conversion moment (PRODUCT §14): non-blocking, dismissible. */
export function LimitReachedSheet({ open, onClose, used, limit }: Props) {
  return (
    <BottomSheet open={open} onClose={onClose} ariaLabel="Daily AI limit reached">
      <h2 className="text-lg font-medium">You&rsquo;re out of AI plans for today</h2>
      <p className="mt-1 text-text-secondary">
        You&rsquo;ve used today&apos;s {used} AI {limit === 1 ? "input" : "inputs"}. Upgrade to Pro for unlimited planning.
      </p>
      <Link
        href="/plans"
        className="mt-4 flex min-h-11 items-center justify-center rounded-full bg-fill-accent px-4 text-[15px] font-medium text-on-accent"
      >
        See Plans
      </Link>
      <button type="button" onClick={onClose} className="mt-2 min-h-11 w-full text-[15px] text-text-secondary">
        Not now
      </button>
    </BottomSheet>
  );
}
