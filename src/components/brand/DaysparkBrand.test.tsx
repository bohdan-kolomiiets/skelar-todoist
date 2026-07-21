import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DaysparkMark } from "./DaysparkMark";
import { DaysparkBadge } from "./DaysparkBadge";
import { DaysparkWordmark } from "./DaysparkWordmark";

describe("Dayspark brand components", () => {
  it("mark renders an accessible svg", () => {
    render(<DaysparkMark />);
    expect(screen.getByRole("img", { name: /dayspark/i })).toBeInTheDocument();
  });

  it("badge renders an accessible svg", () => {
    render(<DaysparkBadge />);
    expect(screen.getByRole("img", { name: /dayspark/i })).toBeInTheDocument();
  });

  it("wordmark shows the Dayspark text and a mark", () => {
    const { container } = render(<DaysparkWordmark />);
    expect(screen.getByText("Day")).toBeInTheDocument();
    expect(screen.getByText("spark")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
