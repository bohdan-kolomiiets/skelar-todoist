import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

import Landing from "./page";

describe("Landing redirect", () => {
  beforeEach(() => { localStorage.clear(); replace.mockClear(); });

  it("sends a pre-guest visitor to Welcome", () => {
    render(<Landing />);
    expect(replace).toHaveBeenCalledWith("/welcome");
  });

  it("sends a guest with no tasks to Capture", async () => {
    const { LocalAuthService } = await import("@/lib/auth/LocalAuthService");
    new LocalAuthService().startGuest();
    render(<Landing />);
    expect(replace).toHaveBeenCalledWith("/capture");
  });
});
