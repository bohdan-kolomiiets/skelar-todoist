import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TipsSheet } from "./TipsSheet";

describe("TipsSheet", () => {
  it("renders nothing when closed", () => {
    render(<TipsSheet open={false} onClose={vi.fn()} />);
    expect(screen.queryByText(/how i read your dump/i)).not.toBeInTheDocument();
  });

  it("shows the phrasing guide when open", () => {
    render(<TipsSheet open onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: /how i read your dump/i })).toBeInTheDocument();
    // A few real, parser-accurate cues.
    expect(screen.getByText(/due Friday/i)).toBeInTheDocument();
    expect(screen.getByText("Someday")).toBeInTheDocument();
    // Honest about ambiguous dates (matches the "never guess" prompt rule).
    expect(screen.getByText(/set it in Review/i)).toBeInTheDocument();
  });
});
