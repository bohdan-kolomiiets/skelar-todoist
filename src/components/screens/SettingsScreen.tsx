"use client";

import Link from "next/link";
import { useState } from "react";
import { IconChevronRight } from "@tabler/icons-react";
import { useAuth } from "@/lib/auth/useAuth";
import { TipsSheet } from "@/components/capture/TipsSheet";

/** Account/plan surface (PRODUCT §15). Show/hide-completed stays per screen — not here. */
export function SettingsScreen() {
  const { profile, isPro } = useAuth();
  const [tipsOpen, setTipsOpen] = useState(false);

  const account =
    profile == null || profile.tier === "guest"
      ? "Sign in to save your plan"
      : profile.email ?? profile.name ?? "Signed in";

  return (
    <section className="flex flex-1 flex-col gap-4 px-4 py-4">
      <header>
        <h1 className="text-xl font-medium">Settings</h1>
      </header>

      <div className="rounded-xl border border-border bg-surface-1">
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs text-text-muted">Account</p>
          <p className="mt-0.5">{account}</p>
        </div>
        <Link href="/plans" className="flex min-h-11 items-center justify-between px-4 py-3" aria-label="Plan">
          <span>Plan</span>
          <span className="flex items-center gap-1 text-text-secondary">
            {isPro ? "Pro" : "Free"}
            <IconChevronRight size={16} aria-hidden />
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setTipsOpen(true)}
          className="flex min-h-11 w-full items-center justify-between border-t border-border px-4 py-3 text-left"
        >
          <span>Guidance</span>
          <IconChevronRight size={16} className="text-text-secondary" aria-hidden />
        </button>
      </div>

      <TipsSheet open={tipsOpen} onClose={() => setTipsOpen(false)} />
    </section>
  );
}
