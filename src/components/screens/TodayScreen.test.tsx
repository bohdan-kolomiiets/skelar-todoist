import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TodayScreen } from "./TodayScreen";
import { TaskStoreProvider } from "@/lib/tasks/TaskStoreProvider";
import { MemoryTaskStore } from "@/lib/storage/MemoryTaskStore";
import { createTask } from "@/lib/task/createTask";
import { todayISO } from "@/lib/date/clock";
import type { Task } from "@/lib/task/types";

const renderWith = (tasks: Task[] = []) =>
  render(
    <TaskStoreProvider store={new MemoryTaskStore(tasks)}>
      <TodayScreen />
    </TaskStoreProvider>,
  );

describe("TodayScreen", () => {
  it("shows the empty state when nothing is planned", () => {
    renderWith();
    expect(screen.getByText(/nothing planned/i)).toBeInTheDocument();
  });

  it("lists today's tasks and a progress line", () => {
    const today = todayISO();
    const tasks = [createTask({ title: "Team standup", doDate: today, time: "09:00" }, { id: "a", order: 0 })];
    renderWith(tasks);
    expect(screen.getByText("Team standup")).toBeInTheDocument();
    expect(screen.getByText(/0 of 1 done/i)).toBeInTheDocument();
  });

  it("completing a task updates the progress line", async () => {
    const today = todayISO();
    const tasks = [createTask({ title: "Gym", doDate: today }, { id: "b", order: 0 })];
    renderWith(tasks);
    await userEvent.click(screen.getByRole("button", { name: /complete/i }));
    expect(screen.getByText(/1 of 1 done/i)).toBeInTheDocument();
  });
});
