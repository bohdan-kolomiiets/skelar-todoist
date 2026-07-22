import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

import { AuthProvider } from "@/lib/auth/AuthProvider";
import { LocalAuthService } from "@/lib/auth/LocalAuthService";
import { RequireProfile } from "./RequireProfile";

function renderGuard(service: LocalAuthService) {
  return render(
    <AuthProvider service={service}>
      <RequireProfile>
        <div>protected</div>
      </RequireProfile>
    </AuthProvider>,
  );
}

describe("RequireProfile", () => {
  beforeEach(() => { localStorage.clear(); replace.mockClear(); });

  it("redirects a pre-guest visitor to /welcome and hides children", () => {
    renderGuard(new LocalAuthService());
    expect(replace).toHaveBeenCalledWith("/welcome");
    expect(screen.queryByText("protected")).not.toBeInTheDocument();
  });

  it("renders children for a guest and does not redirect", () => {
    const service = new LocalAuthService();
    service.startGuest();
    renderGuard(service);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText("protected")).toBeInTheDocument();
  });
});
