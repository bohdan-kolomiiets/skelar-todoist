import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { LocalAuthService } from "@/lib/auth/LocalAuthService";
import { LocalWaitlistService } from "@/lib/waitlist/LocalWaitlistService";
import { VoiceComingSoonSheet } from "./VoiceComingSoonSheet";

function renderSheet(service: LocalAuthService, open = true) {
  return render(
    <AuthProvider service={service}>
      <VoiceComingSoonSheet open={open} onClose={vi.fn()} />
    </AuthProvider>,
  );
}

describe("VoiceComingSoonSheet", () => {
  beforeEach(() => localStorage.clear());

  it("lets a guest join with an email field, then shows the joined state", async () => {
    const auth = new LocalAuthService();
    auth.startGuest();
    renderSheet(auth);
    await userEvent.type(screen.getByLabelText(/email/i), "guest@example.com");
    await userEvent.click(screen.getByRole("button", { name: /notify me/i }));
    expect(screen.getByText(/you['’]re on the list/i)).toBeInTheDocument();
    expect(new LocalWaitlistService().getLead("voice")?.email).toBe("guest@example.com");
  });

  it("one-tap joins a signed-in user using their known email (no email field)", async () => {
    const auth = new LocalAuthService();
    auth.startGuest();
    auth.signIn({ emailOrName: "sam@example.com" }); // free, email known
    renderSheet(auth);
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /notify me/i }));
    expect(screen.getByText(/you['’]re on the list/i)).toBeInTheDocument();
    expect(new LocalWaitlistService().getLead("voice")?.email).toBe("sam@example.com");
  });

  it("shows the joined state on open when already on the list", () => {
    const auth = new LocalAuthService();
    auth.startGuest();
    new LocalWaitlistService().join({ email: "prev@example.com", feature: "voice" });
    renderSheet(auth);
    expect(screen.getByText(/you['’]re on the list/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /notify me/i })).not.toBeInTheDocument();
  });
});
