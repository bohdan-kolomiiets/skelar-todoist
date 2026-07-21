import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { WelcomeScreen } from "./WelcomeScreen";
import { LocalAuthService } from "@/lib/auth/LocalAuthService";

describe("WelcomeScreen", () => {
  beforeEach(() => { localStorage.clear(); push.mockClear(); });

  it("Get started mints a guest and routes to Capture", async () => {
    render(<WelcomeScreen />);
    await userEvent.click(screen.getByRole("button", { name: /get started/i }));
    expect(new LocalAuthService().current()?.tier).toBe("guest");
    expect(push).toHaveBeenCalledWith("/capture");
  });

  it("Sign in reveals the form and creates a free profile", async () => {
    render(<WelcomeScreen />);
    await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    await userEvent.type(screen.getByLabelText(/email or name/i), "sam@example.com");
    await userEvent.click(screen.getByRole("button", { name: /save my plan|continue|sign in/i }));
    expect(new LocalAuthService().current()?.tier).toBe("free");
    expect(push).toHaveBeenCalledWith("/capture");
  });
});
