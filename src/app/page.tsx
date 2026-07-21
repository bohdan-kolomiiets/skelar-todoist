"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LocalTaskStore } from "@/lib/storage/LocalTaskStore";

/** Landing rule (PRODUCT §13): any task exists → Today; otherwise → Capture. */
export default function Landing() {
  const router = useRouter();
  useEffect(() => {
    const hasTasks = new LocalTaskStore().load().length > 0;
    router.replace(hasTasks ? "/today" : "/capture");
  }, [router]);
  return null;
}
