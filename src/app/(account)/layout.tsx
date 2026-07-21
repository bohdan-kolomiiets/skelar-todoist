import Link from "next/link";
import { IconChevronLeft } from "@tabler/icons-react";
import { AuthProvider } from "@/lib/auth/AuthProvider";

/** Account surfaces (Plans/Settings) — reactive to auth, off the tab bar (PRODUCT §15). */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-surface-2 text-text-primary">
        <header className="flex items-center gap-1 border-b border-border px-2 py-1.5">
          <Link href="/today" aria-label="Back" className="flex h-11 w-11 items-center justify-center text-text-secondary">
            <IconChevronLeft size={20} aria-hidden />
          </Link>
        </header>
        <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    </AuthProvider>
  );
}
