"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/useAuth";

const PRO_SOON = ["Voice capture", "Week view", "Reminders & notifications"];

/** Free vs Pro (PRODUCT §14). Fake, one-tap upgrade — clearly a demo, no card. */
export function PlansScreen() {
  const { profile, isPro, upgrade, downgrade } = useAuth();
  const tier = profile?.tier ?? null;

  return (
    <section className="flex flex-1 flex-col gap-4 px-4 py-4">
      <header>
        <h1 className="text-xl font-medium">Plans</h1>
        <p className="mt-0.5 text-[13px] text-text-secondary">Upgrade any time — it&rsquo;s a demo, no card needed.</p>
      </header>

      <div className="rounded-xl border border-border bg-surface-1 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Free</h2>
          {!isPro && <span className="rounded-full bg-bg-accent px-2 py-0.5 text-xs text-text-accent">Current plan</span>}
        </div>
        <ul className="mt-2 space-y-1 text-[13px] text-text-secondary">
          <li>Full planner — Today, Inbox, editor</li>
          <li>A few AI plans per day</li>
        </ul>
      </div>

      <div className="rounded-xl border border-border-strong bg-surface-1 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Pro</h2>
          {isPro && <span className="rounded-full bg-bg-accent px-2 py-0.5 text-xs text-text-accent">Current plan</span>}
        </div>
        <ul className="mt-2 space-y-1 text-[13px] text-text-secondary">
          <li>Unlimited AI plans</li>
          {PRO_SOON.map((f) => (
            <li key={f}>
              {f} <span className="text-text-muted">· coming soon</span>
            </li>
          ))}
        </ul>
      </div>

      {tier === null ? (
        <Link
          href="/welcome"
          className="flex min-h-11 items-center justify-center rounded-full bg-fill-accent px-4 text-[15px] font-medium text-on-accent"
        >
          Get started
        </Link>
      ) : isPro ? (
        <button type="button" onClick={downgrade} className="min-h-11 text-[15px] text-text-secondary">
          Downgrade to Free
        </button>
      ) : (
        <button
          type="button"
          onClick={upgrade}
          className="min-h-11 rounded-full bg-fill-accent px-4 text-[15px] font-medium text-on-accent"
        >
          Upgrade to Pro
        </button>
      )}
    </section>
  );
}
