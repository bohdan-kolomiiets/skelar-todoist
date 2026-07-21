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
});
