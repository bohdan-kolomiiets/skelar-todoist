import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewScreen } from "./ReviewScreen";
import { todayISO } from "@/lib/date/clock";

const proposal = [
  { title: "Finish the pitch deck", doDate: todayISO(), deadline: "2999-01-01", priority: "high" as const },
  { title: "Read design book", doDate: null },
];

describe("ReviewScreen", () => {
  it("groups tasks into Today and Inbox with a dynamic commit label", () => {
    render(<ReviewScreen proposal={proposal} onCommit={vi.fn()} onStartOver={vi.fn()} />);
    expect(screen.getByText(/today · 1/i)).toBeInTheDocument();
    expect(screen.getByText(/inbox · 1/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add 2 tasks/i })).toBeInTheDocument();
  });

  it("removing a card updates the count and commit label", async () => {
    render(<ReviewScreen proposal={proposal} onCommit={vi.fn()} onStartOver={vi.fn()} />);
    await userEvent.click(screen.getAllByRole("button", { name: /remove/i })[0]);
    expect(screen.getByRole("button", { name: /add 1 task$/i })).toBeInTheDocument();
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

  it("toggles a task's placement between Today and Inbox", async () => {
    render(<ReviewScreen proposal={proposal} onCommit={vi.fn()} onStartOver={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Today/ }));
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
    await userEvent.click(screen.getAllByRole("button", { name: /remove/i })[0]);
    expect(screen.queryByLabelText(/title/i)).not.toBeInTheDocument();
  });

  it("changing a card's placement does not open the editor", async () => {
    render(<ReviewScreen proposal={proposal} onCommit={vi.fn()} onStartOver={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Today/ }));
    expect(screen.queryByLabelText(/title/i)).not.toBeInTheDocument();
  });
});
