import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AuthProvider } from "../auth/AuthProvider";
import { LocalAuthService } from "../auth/LocalAuthService";
import { SaveNudgeProvider } from "./SaveNudgeProvider";
import { useSaveNudge } from "./useSaveNudge";

function Trigger() {
  const { notifySaved } = useSaveNudge();
  return <button onClick={() => notifySaved()}>save</button>;
}

function setup(service: LocalAuthService) {
  return render(
    <AuthProvider service={service}>
      <SaveNudgeProvider>
        <Trigger />
      </SaveNudgeProvider>
    </AuthProvider>,
  );
}

describe("SaveNudgeProvider", () => {
  beforeEach(() => localStorage.clear());

  it("shows the nudge on a guest's first save, once", async () => {
    const service = new LocalAuthService();
    service.startGuest();
    setup(service);
    await act(async () => { screen.getByText("save").click(); });
    expect(screen.getByText(/keep this plan/i)).toBeInTheDocument();
    // Dismiss + save again → does not reappear (hasSavedOnce guards it).
    await act(async () => { screen.getByRole("button", { name: /continue as guest/i }).click(); });
    await act(async () => { screen.getByText("save").click(); });
    expect(screen.queryByText(/keep this plan/i)).not.toBeInTheDocument();
  });

  it("never shows the nudge for a signed-in (free) user", async () => {
    const service = new LocalAuthService();
    service.startGuest();
    service.signIn({ emailOrName: "sam@example.com" });
    setup(service);
    await act(async () => { screen.getByText("save").click(); });
    expect(screen.queryByText(/keep this plan/i)).not.toBeInTheDocument();
  });
});
