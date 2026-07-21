import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AuthProvider } from "../auth/AuthProvider";
import { LocalAuthService } from "../auth/LocalAuthService";
import { ProfileTaskStore } from "./ProfileTaskStore";
import { useTasks } from "./useTasks";
import { useAuth } from "../auth/useAuth";

function Probe() {
  const { tasks, addTask } = useTasks();
  const { signIn } = useAuth();
  return (
    <div>
      <span data-testid="count">{tasks.length}</span>
      <button onClick={() => addTask({ title: "Kept" })}>add</button>
      <button onClick={() => signIn({ emailOrName: "sam@example.com" })}>signin</button>
    </div>
  );
}

describe("ProfileTaskStore", () => {
  it("preserves tasks across sign-in (copy-on-sign-in bucket)", async () => {
    localStorage.clear();
    const service = new LocalAuthService();
    service.startGuest();
    render(
      <AuthProvider service={service}>
        <ProfileTaskStore>
          <Probe />
        </ProfileTaskStore>
      </AuthProvider>,
    );
    await act(async () => { screen.getByText("add").click(); });
    expect(screen.getByTestId("count").textContent).toBe("1");
    await act(async () => { screen.getByText("signin").click(); });
    // Remounted under the user bucket, which was copied from guest → task survives.
    expect(screen.getByTestId("count").textContent).toBe("1");
  });
});
