import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskRow } from "./TaskRow";
import { createTask } from "@/lib/task/createTask";

const TODAY = "2026-07-20";
const task = createTask(
  { title: "Finish the pitch deck", doDate: TODAY, deadline: "2026-07-24", priority: "high", tags: ["work"] },
  { id: "id1", now: "2026-07-20T00:00:00Z", order: 0 },
);

describe("TaskRow", () => {
  it("shows the title, priority flag, deadline badge, and tag", () => {
    render(<TaskRow task={task} today={TODAY} onToggle={vi.fn()} onOpen={vi.fn()} onMove={vi.fn()} moveTarget="inbox" />);
    expect(screen.getByText("Finish the pitch deck")).toBeInTheDocument();
    expect(screen.getByLabelText(/high priority/i)).toBeInTheDocument();
    expect(screen.getByText("due in 4 days")).toBeInTheDocument();
    expect(screen.getByText("work")).toBeInTheDocument();
  });

  it("calls onToggle when the complete button is pressed", async () => {
    const onToggle = vi.fn();
    render(<TaskRow task={task} today={TODAY} onToggle={onToggle} onOpen={vi.fn()} onMove={vi.fn()} moveTarget="inbox" />);
    await userEvent.click(screen.getByRole("button", { name: /complete/i }));
    expect(onToggle).toHaveBeenCalledWith("id1");
  });

  it("calls onMove with the move target", async () => {
    const onMove = vi.fn();
    render(<TaskRow task={task} today={TODAY} onToggle={vi.fn()} onOpen={vi.fn()} onMove={onMove} moveTarget="inbox" />);
    await userEvent.click(screen.getByRole("button", { name: /move to inbox/i }));
    expect(onMove).toHaveBeenCalledWith("id1", "inbox");
  });

  it("opens the task when the title is tapped", async () => {
    const onOpen = vi.fn();
    render(<TaskRow task={task} today={TODAY} onToggle={vi.fn()} onOpen={onOpen} onMove={vi.fn()} moveTarget="inbox" />);
    await userEvent.click(screen.getByText("Finish the pitch deck"));
    expect(onOpen).toHaveBeenCalledWith(task);
  });

  it("shows done state and suppresses priority flag when task is completed", () => {
    const doneTask = { ...task, status: "done" as const };
    render(<TaskRow task={doneTask} today={TODAY} onToggle={vi.fn()} onOpen={vi.fn()} onMove={vi.fn()} moveTarget="inbox" />);
    expect(screen.getByRole("button", { name: /completed/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/high priority/i)).toBeNull();
  });
});
