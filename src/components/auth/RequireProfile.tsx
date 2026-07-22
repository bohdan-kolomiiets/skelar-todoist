"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { useIsHydrated } from "@/lib/hooks/useIsHydrated";

/**
 * Gate the app behind a profile (PRODUCT §12/§13): once hydrated, a pre-guest
 * (no profile) is sent to /welcome. Pre-hydration renders children so the server
 * and first client render agree (no SSR redirect). Only wraps the (app) group;
 * /plans and /settings stay reachable pre-guest.
 */
export function RequireProfile({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { profile } = useAuth();
  const isHydrated = useIsHydrated();

  useEffect(() => {
    if (isHydrated && profile === null) router.replace("/welcome");
  }, [isHydrated, profile, router]);

  if (isHydrated && profile === null) return null; // hide children while redirecting
  return <>{children}</>;
}
