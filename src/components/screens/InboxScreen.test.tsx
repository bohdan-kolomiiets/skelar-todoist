import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InboxScreen } from "./InboxScreen";
import { TaskStoreProvider } from "@/lib/tasks/TaskStoreProvider";
import { MemoryTaskStore } from "@/lib/storage/MemoryTaskStore";
import { createTask } from "@/lib/task/createTask";
import type { Task } from "@/lib/task/types";

const renderWith = (tasks: Task[] = []) =>
  render(
    <TaskStoreProvider store={new MemoryTaskStore(tasks)}>
      <InboxScreen />
    </TaskStoreProvider>,
  );

describe("InboxScreen", () => {
  it("shows the empty state at inbox zero", () => {
    renderWith();
    expect(screen.getByText(/inbox zero/i)).toBeInTheDocument();
  });

  it("splits scheduled and someday tasks", () => {
    const tasks = [
      createTask({ title: "Learn guitar", doDate: null }, { id: "s1", order: 1 }),
      createTask({ title: "Book dentist", doDate: "2999-01-01" }, { id: "s2", order: 2 }),
    ];
    renderWith(tasks);
    expect(screen.getByText("Scheduled · 1")).toBeInTheDocument();
    expect(screen.getByText("Someday · 1")).toBeInTheDocument();
    expect(screen.getByText("Learn guitar")).toBeInTheDocument();
  });
});
