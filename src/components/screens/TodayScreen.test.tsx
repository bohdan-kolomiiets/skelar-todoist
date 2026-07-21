import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TodayScreen } from "./TodayScreen";
import { TaskStoreProvider } from "@/lib/tasks/TaskStoreProvider";
import { MemoryTaskStore } from "@/lib/storage/MemoryTaskStore";
import { createTask } from "@/lib/task/createTask";
import { todayISO } from "@/lib/date/clock";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { LocalAuthService } from "@/lib/auth/LocalAuthService";
import { SaveNudgeProvider } from "@/lib/nudge/SaveNudgeProvider";
import type { Task } from "@/lib/task/types";

const renderWith = (tasks: Task[] = []) => {
  const service = new LocalAuthService();
  service.startGuest();
  return render(
    <AuthProvider service={service}>
      <SaveNudgeProvider>
        <TaskStoreProvider store={new MemoryTaskStore(tasks)}>
          <TodayScreen />
        </TaskStoreProvider>
      </SaveNudgeProvider>
    </AuthProvider>,
  );
};

describe("TodayScreen", () => {
  beforeEach(() => localStorage.clear());

  it("shows the empty state when nothing is planned", () => {
    renderWith();
    expect(screen.getByText(/nothing planned/i)).toBeInTheDocument();
  });

  it("shows a Settings gear linking to /settings", () => {
    renderWith();
    expect(screen.getByRole("link", { name: /settings/i })).toHaveAttribute("href", "/settings");
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

  it("shows inbox-aware empty state when nothing is planned but inbox has tasks", () => {
    const inboxTask = createTask({ title: "x", doDate: null }, { id: "inbox", order: 0 });
    renderWith([inboxTask]);
    expect(screen.getByText(/pull from inbox/i)).toBeInTheDocument();
  });

  it("shows and hides completed tasks on toggle", async () => {
    const today = todayISO();
    const task = createTask({ title: "Done task", doDate: today }, { id: "c", order: 0 });
    task.status = "done";
    task.completedAt = today;
    renderWith([task]);
    expect(screen.queryByText("Done task")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /show/i }));
    expect(screen.getByText("Done task")).toBeInTheDocument();
    expect(screen.getByText(/completed · 1/i)).toBeInTheDocument();
  });

  it("remembers the Completed section stays expanded across remounts", async () => {
    const today = todayISO();
    const task = createTask({ title: "Done task", doDate: today }, { id: "c", order: 0 });
    task.status = "done";
    task.completedAt = today;

    const first = renderWith([task]);
    await userEvent.click(screen.getByRole("button", { name: /show/i }));
    first.unmount();

    // Fresh mount (simulates a refresh / tab switch): the preference is remembered.
    renderWith([task]);
    expect(screen.getByText("Done task")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hide/i })).toBeInTheDocument();
  });
});
