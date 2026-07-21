import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { VoiceComingSoonSheet } from "./VoiceComingSoonSheet";

describe("VoiceComingSoonSheet", () => {
  it("renders nothing when closed", () => {
    render(<VoiceComingSoonSheet open={false} onClose={vi.fn()} />);
    expect(screen.queryByText(/talk instead of type/i)).not.toBeInTheDocument();
  });

  it("shows a minimal coming-soon message when open", () => {
    render(<VoiceComingSoonSheet open onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: /voice capture/i })).toBeInTheDocument();
    expect(screen.getByText(/talk instead of type/i)).toBeInTheDocument();
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  it("does not include the waitlist yet (deferred to Plan 2)", () => {
    render(<VoiceComingSoonSheet open onClose={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /notify me/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
