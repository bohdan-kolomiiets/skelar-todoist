"use client";

import Link from "next/link";
import { IconSettings } from "@tabler/icons-react";

/** Small entry point to /settings, dropped into the primary screen headers. */
export function SettingsGear() {
  return (
    <Link
      href="/settings"
      aria-label="Settings"
      className="flex h-11 w-11 items-center justify-center text-text-secondary"
    >
      <IconSettings size={20} aria-hidden />
    </Link>
  );
}
