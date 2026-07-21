"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBulb, IconSun, IconInbox } from "@tabler/icons-react";

const TABS = [
  { href: "/capture", label: "Capture", Icon: IconBulb },
  { href: "/today", label: "Today", Icon: IconSun },
  { href: "/inbox", label: "Inbox", Icon: IconInbox },
] as const;

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="flex border-t border-border bg-surface-2 px-1 pb-2 pt-0.5" aria-label="Primary">
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] ${
              active ? "text-text-accent" : "text-text-muted"
            }`}
          >
            <Icon size={22} stroke={1.75} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
