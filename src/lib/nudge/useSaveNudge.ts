"use client";

import { useContext } from "react";
import { SaveNudgeContext, type SaveNudgeValue } from "./SaveNudgeProvider";

export function useSaveNudge(): SaveNudgeValue {
  const ctx = useContext(SaveNudgeContext);
  if (!ctx) throw new Error("useSaveNudge must be used within a SaveNudgeProvider");
  return ctx;
}
