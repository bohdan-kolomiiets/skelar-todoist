"use client";

import { useContext } from "react";
import { TaskContext, type TaskContextValue } from "./TaskStoreProvider";

export function useTasks(): TaskContextValue {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTasks must be used within a TaskStoreProvider");
  return ctx;
}
