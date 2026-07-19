import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("Home", () => {
  it("renders the product name", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /ai day planner/i }),
    ).toBeInTheDocument();
  });
});
