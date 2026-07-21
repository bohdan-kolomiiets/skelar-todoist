"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LocalAuthService } from "@/lib/auth/LocalAuthService";
import { LocalTaskStore, TASKS_KEY } from "@/lib/storage/LocalTaskStore";
import { profileKey } from "@/lib/profile/profileKey";

/**
 * Landing rule (PRODUCT §12/§13): pre-guest → Welcome; otherwise any task exists →
 * Today, else → Capture. Reads the services directly (no provider) — same pattern
 * as the task-store read this file already used.
 */
export default function Landing() {
  const router = useRouter();
  useEffect(() => {
    const profile = new LocalAuthService().current();
    if (!profile) {
      router.replace("/welcome");
      return;
    }
    const hasTasks = new LocalTaskStore(profileKey(TASKS_KEY, profile.id)).load().length > 0;
    router.replace(hasTasks ? "/today" : "/capture");
  }, [router]);
  return null;
}
