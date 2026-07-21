import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmSheet } from "./ConfirmSheet";

const base = {
  title: "Remove this task?",
  description: "Finish the pitch deck",
  confirmLabel: "Remove",
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe("ConfirmSheet", () => {
  it("renders nothing when closed", () => {
    render(<ConfirmSheet {...base} open={false} />);
    expect(screen.queryByText(/remove this task/i)).not.toBeInTheDocument();
  });

  it("shows the title and description as a dialog when open", () => {
    render(<ConfirmSheet {...base} open />);
    expect(screen.getByRole("dialog", { name: /remove this task/i })).toBeInTheDocument();
    expect(screen.getByText("Finish the pitch deck")).toBeInTheDocument();
  });

  it("fires onConfirm when the confirm button is tapped", async () => {
    const onConfirm = vi.fn();
    render(<ConfirmSheet {...base} open onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("fires onCancel when the cancel button is tapped", async () => {
    const onCancel = vi.fn();
    render(<ConfirmSheet {...base} open onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("uses a custom cancel label when provided", () => {
    render(<ConfirmSheet {...base} open cancelLabel="Keep it" />);
    expect(screen.getByRole("button", { name: /keep it/i })).toBeInTheDocument();
  });

  it("cancels (not confirms) on Escape — delegated to the sheet", async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<ConfirmSheet {...base} open onCancel={onCancel} onConfirm={onConfirm} />);
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
