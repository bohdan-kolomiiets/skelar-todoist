import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { LocalAuthService } from "@/lib/auth/LocalAuthService";
import { SettingsScreen } from "./SettingsScreen";

function renderSettings(service: LocalAuthService) {
  return render(
    <AuthProvider service={service}>
      <SettingsScreen />
    </AuthProvider>,
  );
}

describe("SettingsScreen", () => {
  beforeEach(() => localStorage.clear());

  it("shows the plan row linking to Plans, reflecting Free", () => {
    const service = new LocalAuthService();
    service.startGuest();
    renderSettings(service);
    const planLink = screen.getByRole("link", { name: /plan/i });
    expect(planLink).toHaveAttribute("href", "/plans");
    expect(planLink).toHaveTextContent(/free/i);
  });

  it("reflects Pro in the plan row after upgrade", () => {
    const service = new LocalAuthService();
    service.startGuest();
    service.setTier("pro");
    renderSettings(service);
    expect(screen.getByRole("link", { name: /plan/i })).toHaveTextContent(/pro/i);
  });
});
