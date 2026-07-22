import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DeadlineBadge } from "./DeadlineBadge";

const TODAY = "2026-07-20";
// Chip renders tone via classes; assert the neutral tone is NOT the warning bg.
function toneClasses(el: HTMLElement) {
  return el.querySelector("span")?.className ?? "";
}

describe("DeadlineBadge tones", () => {
  it("far-future deadline is neutral (not warning)", () => {
    const { container } = render(<DeadlineBadge deadline="2026-08-15" today={TODAY} />);
    expect(toneClasses(container)).toContain("bg-surface-1"); // neutral Chip tone
    expect(toneClasses(container)).not.toContain("bg-bg-warning");
  });
  it("within-7-days deadline is warning", () => {
    const { container } = render(<DeadlineBadge deadline="2026-07-23" today={TODAY} />);
    expect(toneClasses(container)).toContain("bg-bg-warning");
  });
  it("overdue deadline is danger", () => {
    const { container } = render(<DeadlineBadge deadline="2026-07-18" today={TODAY} />);
    expect(toneClasses(container)).toContain("bg-bg-danger");
  });
});
