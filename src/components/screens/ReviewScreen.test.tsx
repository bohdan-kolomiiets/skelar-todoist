import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewScreen } from "./ReviewScreen";
import { todayISO } from "@/lib/date/clock";
import { formatDoDate } from "@/lib/date/format";

const proposal = [
  { title: "Finish the pitch deck", doDate: todayISO(), deadline: "2999-01-01", priority: "high" as const },
  { title: "Read design book", doDate: null },
];

/** Local-time date arithmetic that matches todayISO()'s local getters. */
function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return todayISO(new Date(y, m - 1, d + days));
}

describe("ReviewScreen", () => {
  it("groups tasks into Today and Inbox with a dynamic commit label", () => {
    render(<ReviewScreen proposal={proposal} onCommit={vi.fn()} onStartOver={vi.fn()} />);
    expect(screen.getByText(/today · 1/i)).toBeInTheDocument();
    expect(screen.getByText(/inbox · 1/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add 2 tasks/i })).toBeInTheDocument();
  });

  it("asks for confirmation before removing, then updates the count and commit label", async () => {
    render(<ReviewScreen proposal={proposal} onCommit={vi.fn()} onStartOver={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /remove finish the pitch deck/i }));
    // The ✕ opens a confirmation — the task is NOT gone yet.
    const dialog = screen.getByRole("dialog", { name: /remove this task/i });
    expect(within(dialog).getByText("Finish the pitch deck")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add 2 tasks/i })).toBeInTheDocument();
    // Confirming the dialog performs the removal.
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove" }));
    expect(screen.getByRole("button", { name: /add 1 task$/i })).toBeInTheDocument();
  });

  it("keeps the task when the removal is canceled", async () => {
    render(<ReviewScreen proposal={proposal} onCommit={vi.fn()} onStartOver={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /remove finish the pitch deck/i }));
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add 2 tasks/i })).toBeInTheDocument();
  });

  it("commits the edited proposal", async () => {
    const onCommit = vi.fn();
    render(<ReviewScreen proposal={proposal} onCommit={onCommit} onStartOver={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /add 2 tasks/i }));
    expect(onCommit).toHaveBeenCalledWith(proposal);
  });

  it("guards against double-submit", async () => {
    const onCommit = vi.fn();
    render(<ReviewScreen proposal={proposal} onCommit={onCommit} onStartOver={vi.fn()} />);
    const commitButton = screen.getByRole("button", { name: /add 2 tasks/i });
    await userEvent.click(commitButton);
    await userEvent.click(commitButton);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("surfaces a future-dated task's do-date on its card, but not for today's tasks", () => {
    const today = todayISO();
    const inThreeDays = addDays(today, 3);
    render(
      <ReviewScreen
        proposal={[
          { title: "Grab delivery", doDate: inThreeDays, timeOfDay: "morning" as const },
          { title: "Ship it today", doDate: today },
        ]}
        onCommit={vi.fn()}
        onStartOver={vi.fn()}
      />,
    );
    // The future-dated task lands in Inbox; its card must say WHEN, not just "morning".
    expect(screen.getByText(formatDoDate(inThreeDays, today))).toBeInTheDocument();
    // A task already under the "Today" header shouldn't repeat today's date.
    expect(screen.queryByText(formatDoDate(today, today))).not.toBeInTheDocument();
  });

  it("labels the placement control as a move action, not a dropdown", () => {
    render(<ReviewScreen proposal={proposal} onCommit={vi.fn()} onStartOver={vi.fn()} />);
    // Today task offers to move to Inbox; Inbox task offers to move to Today.
    expect(screen.getByRole("button", { name: /move to inbox/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /move to today/i })).toBeInTheDocument();
  });

  it("toggles a task's placement between Today and Inbox", async () => {
    render(<ReviewScreen proposal={proposal} onCommit={vi.fn()} onStartOver={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /move to inbox/i }));
    expect(screen.getByText(/inbox · 2/i)).toBeInTheDocument();
  });

  it("opens the editor from a whole-card affordance, not just the title text", async () => {
    render(<ReviewScreen proposal={proposal} onCommit={vi.fn()} onStartOver={vi.fn()} />);
    // The entire card is the edit control (issue #4 #3) — exposed as an "Edit <title>" button.
    await userEvent.click(screen.getByRole("button", { name: /edit finish the pitch deck/i }));
    const titleInput = screen.getByLabelText(/title/i);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Finalize the pitch deck");
    await userEvent.click(screen.getByRole("button", { name: /^done$/i }));
    expect(screen.getByText("Finalize the pitch deck")).toBeInTheDocument();
  });

  it("removing a card does not also open the editor", async () => {
    render(<ReviewScreen proposal={proposal} onCommit={vi.fn()} onStartOver={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /remove finish the pitch deck/i }));
    // The ✕ opens the confirm dialog, not the task editor…
    expect(screen.queryByLabelText(/title/i)).not.toBeInTheDocument();
    // …and confirming the removal still doesn't open it.
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Remove" }));
    expect(screen.queryByLabelText(/title/i)).not.toBeInTheDocument();
  });

  it("changing a card's placement does not open the editor", async () => {
    render(<ReviewScreen proposal={proposal} onCommit={vi.fn()} onStartOver={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /move to inbox/i }));
    expect(screen.queryByLabelText(/title/i)).not.toBeInTheDocument();
  });

  it("uses Tabler icons for remove and the placement pill (P1)", () => {
    render(<ReviewScreen proposal={proposal} onCommit={vi.fn()} onStartOver={vi.fn()} />);
    const remove = screen.getAllByRole("button", { name: /remove/i })[0];
    expect(remove.querySelector("svg")).toBeInTheDocument();
    const pill = screen.getAllByRole("button", { name: /move to (inbox|today)/i })[0];
    expect(pill.querySelector("svg")).toBeInTheDocument();
  });
});
