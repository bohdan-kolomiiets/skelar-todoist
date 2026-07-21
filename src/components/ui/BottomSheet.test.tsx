import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BottomSheet } from "./BottomSheet";

describe("BottomSheet", () => {
  it("renders nothing when closed", () => {
    render(
      <BottomSheet open={false} onClose={vi.fn()} ariaLabel="Info">
        <p>Body</p>
      </BottomSheet>,
    );
    expect(screen.queryByText("Body")).not.toBeInTheDocument();
  });

  it("renders its content in a labeled dialog when open", () => {
    render(
      <BottomSheet open onClose={vi.fn()} ariaLabel="Info">
        <p>Body</p>
      </BottomSheet>,
    );
    expect(screen.getByRole("dialog", { name: "Info" })).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} ariaLabel="Info">
        <p>Body</p>
      </BottomSheet>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes when the backdrop is tapped", async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} ariaLabel="Info">
        <p>Body</p>
      </BottomSheet>,
    );
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
