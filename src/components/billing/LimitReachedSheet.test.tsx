import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LimitReachedSheet } from "./LimitReachedSheet";

describe("LimitReachedSheet", () => {
  it("shows the used count and links to Plans when open", () => {
    render(<LimitReachedSheet open used={3} limit={3} onClose={vi.fn()} />);
    expect(screen.getByText(/used today's 3 ai inputs/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see plans/i })).toHaveAttribute("href", "/plans");
  });

  it("renders nothing when closed", () => {
    const { container } = render(<LimitReachedSheet open={false} used={3} limit={3} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
