import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { TabBar } from "./TabBar";

vi.mock("next/navigation", () => ({ usePathname: vi.fn(() => "/today") }));

describe("TabBar", () => {
  afterEach(() => {
    vi.mocked(usePathname).mockReturnValue("/today");
  });

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

  it("updates active tab when pathname changes", () => {
    vi.mocked(usePathname).mockReturnValue("/capture");
    render(<TabBar />);
    expect(screen.getByRole("link", { name: /capture/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /today/i })).not.toHaveAttribute("aria-current");
  });
});
