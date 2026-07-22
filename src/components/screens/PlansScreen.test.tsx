import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { LocalAuthService } from "@/lib/auth/LocalAuthService";
import { PlansScreen } from "./PlansScreen";

function renderPlans(service: LocalAuthService) {
  return render(
    <AuthProvider service={service}>
      <PlansScreen />
    </AuthProvider>,
  );
}

describe("PlansScreen", () => {
  beforeEach(() => localStorage.clear());

  it("upgrades a free user to Pro on tap", async () => {
    const service = new LocalAuthService();
    service.startGuest();
    service.signIn({ emailOrName: "sam@example.com" }); // free
    renderPlans(service);
    await userEvent.click(screen.getByRole("button", { name: /upgrade to pro/i }));
    expect(service.current()?.tier).toBe("pro");
  });

  it("shows a current-plan marker for a Pro user and offers downgrade", async () => {
    const service = new LocalAuthService();
    service.startGuest();
    service.setTier("pro");
    renderPlans(service);
    expect(screen.getByText(/current plan/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /downgrade to free/i }));
    expect(service.current()?.tier).toBe("free");
  });

  it("shows a Get started link (no upgrade) for a pre-guest with no profile", () => {
    const service = new LocalAuthService(); // never startGuest → current() null
    renderPlans(service);
    expect(screen.getByRole("link", { name: /get started/i })).toHaveAttribute("href", "/welcome");
    expect(screen.queryByRole("button", { name: /upgrade to pro/i })).not.toBeInTheDocument();
  });
});
