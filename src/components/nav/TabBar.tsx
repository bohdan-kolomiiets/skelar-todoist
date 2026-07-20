"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/capture", label: "Capture" },
  { href: "/today", label: "Today" },
  { href: "/inbox", label: "Inbox" },
] as const;

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="flex border-t border-border bg-surface-2 px-1 pb-2 pt-0.5" aria-label="Primary">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] ${
              active ? "text-text-accent" : "text-text-muted"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
