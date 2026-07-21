import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AuthProvider } from "../auth/AuthProvider";
import { LocalAuthService } from "../auth/LocalAuthService";
import { ProfileTaskStore } from "./ProfileTaskStore";
import { useTasks } from "./useTasks";
import { useAuth } from "../auth/useAuth";
import { profileKey } from "../profile/profileKey";
import { TASKS_KEY } from "../storage/LocalTaskStore";

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

    // Only fires on a real remount: TaskStoreProvider's tasks live in local
    // useState (lazy-init, never re-reads `store`), so without `key={id}`
    // forcing an unmount/remount, no new getItem(newKey) call would happen —
    // the old in-memory task would just stick around and count would still
    // read "1" by coincidence, not because the new bucket was loaded.
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    getItem.mockClear();

    await act(async () => { screen.getByText("signin").click(); });

    const newId = service.current()!.id;
    const newKey = profileKey(TASKS_KEY, newId);
    // Remounted under the user bucket, which was copied from guest → task survives.
    expect(screen.getByTestId("count").textContent).toBe("1");
    // And it survives because the remounted store actually loaded the new
    // profile's bucket (not because the old store instance was reused).
    expect(getItem.mock.calls.some(([k]) => k === newKey)).toBe(true);

    getItem.mockRestore();
  });
});
