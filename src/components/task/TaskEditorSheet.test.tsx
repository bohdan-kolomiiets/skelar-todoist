import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskEditorSheet } from "./TaskEditorSheet";

describe("TaskEditorSheet", () => {
  it("prefills fields from the initial draft", () => {
    render(
      <TaskEditorSheet
        open
        initial={{ title: "Reply to Anna", doDate: "2026-07-20", priority: "high", tags: ["work"] }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/title/i)).toHaveValue("Reply to Anna");
    expect(screen.getByLabelText(/^when$/i)).toHaveValue("2026-07-20");
    expect(screen.getByLabelText(/priority/i)).toHaveValue("high");
    expect(screen.getByText("work")).toBeInTheDocument();
  });

  it("saves the edited draft on Done", async () => {
    const onSave = vi.fn();
    render(<TaskEditorSheet open initial={{ title: "Old" }} onClose={vi.fn()} onSave={onSave} />);
    const title = screen.getByLabelText(/title/i);
    await userEvent.clear(title);
    await userEvent.type(title, "New title");
    await userEvent.click(screen.getByRole("button", { name: /^done$/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: "New title" }));
  });

  it("renders nothing when closed", () => {
    const { container } = render(<TaskEditorSheet open={false} initial={{ title: "x" }} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("adds a tag via the TagsInput", async () => {
    const onSave = vi.fn();
    render(<TaskEditorSheet open initial={{ title: "t", tags: [] }} onClose={vi.fn()} onSave={onSave} />);
    await userEvent.type(screen.getByLabelText(/add tag/i), "health{enter}");
    await userEvent.click(screen.getByRole("button", { name: /^done$/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ tags: ["health"] }));
  });
});
