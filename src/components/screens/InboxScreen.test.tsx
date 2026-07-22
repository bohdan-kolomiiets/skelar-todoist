import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InboxScreen } from "./InboxScreen";
import { TaskStoreProvider } from "@/lib/tasks/TaskStoreProvider";
import { MemoryTaskStore } from "@/lib/storage/MemoryTaskStore";
import { createTask } from "@/lib/task/createTask";
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
          <InboxScreen />
        </TaskStoreProvider>
      </SaveNudgeProvider>
    </AuthProvider>,
  );
};

describe("InboxScreen", () => {
  beforeEach(() => localStorage.clear());

  it("shows the empty state at inbox zero", () => {
    renderWith();
    expect(screen.getByText(/inbox zero/i)).toBeInTheDocument();
  });

  it("shows a Settings gear linking to /settings", () => {
    renderWith();
    expect(screen.getByRole("link", { name: /settings/i })).toHaveAttribute("href", "/settings");
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
    expect(screen.getByText("Jan 1")).toBeInTheDocument();
  });

  it("renders the Needs a date section", () => {
    const tasks = [
      createTask({ title: "Call the vet", doDate: null, needsDate: true }, { id: "n1", order: 1 }),
    ];
    renderWith(tasks);
    expect(screen.getByText(/needs a date · 1/i)).toBeInTheDocument();
    expect(screen.getByText("Call the vet")).toBeInTheDocument();
  });

  it("shows and hides completed tasks on toggle", async () => {
    const tasks = [createTask({ title: "Learn guitar", doDate: null }, { id: "s1", order: 1 })];
    renderWith(tasks);
    await userEvent.click(screen.getByRole("button", { name: /complete/i }));
    expect(screen.getByText(/completed · 1/i)).toBeInTheDocument();
    expect(screen.queryByText("Learn guitar")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /show/i }));
    expect(screen.getByText("Learn guitar")).toBeInTheDocument();
  });

  it("remembers the Completed section stays expanded across remounts", async () => {
    const task = createTask({ title: "Learn guitar", doDate: null }, { id: "s1", order: 1 });
    task.status = "done";
    task.completedAt = "2026-07-21T10:00:00.000Z";

    const first = renderWith([task]);
    await userEvent.click(screen.getByRole("button", { name: /show/i }));
    first.unmount();

    // Fresh mount (simulates a refresh / tab switch): the preference is remembered.
    renderWith([task]);
    expect(screen.getByText("Learn guitar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hide/i })).toBeInTheDocument();
  });
});
