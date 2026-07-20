import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TabBar } from "./TabBar";

vi.mock("next/navigation", () => ({ usePathname: () => "/today" }));

describe("TabBar", () => {
  it("renders the three primary tabs as links", () => {
    render(<TabBar />);
    expect(screen.getByRole("link", { name: /capture/i })).toHaveAttribute("href", "/capture");
    expect(screen.getByRole("link", { name: /today/i })).toHaveAttribute("href", "/today");
    expect(screen.getByRole("link", { name: /inbox/i })).toHaveAttribute("href", "/inbox");
  });

  it("marks the active tab with aria-current", () => {
    render(<TabBar />);
    expect(screen.getByRole("link", { name: /today/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /capture/i })).not.toHaveAttribute("aria-current");
  });
});
