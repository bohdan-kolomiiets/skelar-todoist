import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: push }) }));
vi.mock("@/lib/ai/organizeClient", () => ({
  organize: vi.fn().mockResolvedValue({
    tasks: [
      { title: "Gym", doDate: null, timeOfDay: "evening" },
      { title: "Read design book", doDate: null },
    ],
    degraded: false,
    freeDailyInputs: 3,
  }),
}));

import { CaptureFlow } from "./CaptureFlow";
import { organize } from "@/lib/ai/organizeClient";
import { TaskStoreProvider } from "@/lib/tasks/TaskStoreProvider";
import { MemoryTaskStore } from "@/lib/storage/MemoryTaskStore";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { LocalAuthService } from "@/lib/auth/LocalAuthService";
import { SaveNudgeProvider } from "@/lib/nudge/SaveNudgeProvider";
import { profileKey } from "@/lib/profile/profileKey";
import { USAGE_KEY } from "@/lib/usage/LocalUsageService";
import { todayISO } from "@/lib/date/clock";
import { LocalWaitlistService } from "@/lib/waitlist/LocalWaitlistService";

function renderCaptureWith(service: LocalAuthService) {
  return render(
    <AuthProvider service={service}>
      <SaveNudgeProvider>
        <TaskStoreProvider store={new MemoryTaskStore()}>
          <CaptureFlow />
        </TaskStoreProvider>
      </SaveNudgeProvider>
    </AuthProvider>,
  );
}

function renderCapture() {
  const service = new LocalAuthService();
  service.startGuest();
  return renderCaptureWith(service);
}

describe("CaptureFlow", () => {
  beforeEach(() => localStorage.clear());
  it("shows the composer and the example chip on first run", () => {
    renderCapture();
    expect(screen.getByPlaceholderText(/what's on your mind/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try an example/i })).toBeInTheDocument();
  });

  it("shows a Settings gear linking to /settings", () => {
    renderCapture();
    expect(screen.getByRole("link", { name: /settings/i })).toHaveAttribute("href", "/settings");
  });

  it("shows a wand icon on the example chip, not an emoji (issue #4 #7)", () => {
    renderCapture();
    const chip = screen.getByRole("button", { name: /try an example/i });
    const icon = chip.querySelector("svg");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("shows a help-circle icon on the Tips button (issue #4 #8)", () => {
    renderCapture();
    const tips = screen.getByRole("button", { name: /tips/i });
    const icon = tips.querySelector("svg");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("opens the Tips guide when the Tips button is tapped (issue #4 #8)", async () => {
    renderCapture();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /tips/i }));
    expect(await screen.findByRole("dialog", { name: /how i read your dump/i })).toBeInTheDocument();
  });

  it("opens the voice coming-soon sheet when the mic is tapped (issue #4 #9)", async () => {
    renderCapture();
    await userEvent.click(screen.getByRole("button", { name: /voice input/i }));
    expect(await screen.findByRole("dialog", { name: /voice capture/i })).toBeInTheDocument();
  });

  it("logs waitlist interest every time the mic is tapped", async () => {
    renderCapture();
    await userEvent.click(screen.getByRole("button", { name: /voice input, coming soon/i }));
    expect(new LocalWaitlistService().interestCount("voice")).toBe(1);
  });

  it("shows a spark on Plan it to signal the AI moment (P1)", () => {
    renderCapture();
    const planIt = screen.getByRole("button", { name: /plan it/i });
    expect(planIt.querySelector("svg")).toBeInTheDocument();
  });

  it("parses a dump and transitions to Review", async () => {
    renderCapture();
    await userEvent.type(screen.getByPlaceholderText(/what's on your mind/i), "Gym this evening. Read design book.");
    await userEvent.click(screen.getByRole("button", { name: /plan it/i }));
    expect(await screen.findByRole("button", { name: /add 2 tasks/i })).toBeInTheDocument();
    // Normal AI path: no "temporarily unavailable" notice.
    expect(screen.queryByText(/temporarily unavailable/i)).not.toBeInTheDocument();
  });

  it("shows an honest notice in Review when the server fell back to the basic parser", async () => {
    vi.mocked(organize).mockResolvedValueOnce({
      tasks: [{ title: "Gym", doDate: null, timeOfDay: "evening" }],
      degraded: true,
      freeDailyInputs: 3,
    });
    renderCapture();
    await userEvent.type(screen.getByPlaceholderText(/what's on your mind/i), "Gym this evening.");
    await userEvent.click(screen.getByRole("button", { name: /plan it/i }));
    // Still lands in Review with a usable plan…
    expect(await screen.findByRole("button", { name: /add 1 task/i })).toBeInTheDocument();
    // …plus an honest, non-blocking notice that the real AI was unavailable.
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
  });

  it("keeps the brain-dump text after Start over so it can be tweaked and re-run", async () => {
    const dump = "Gym this evening. Read design book.";
    renderCapture();
    await userEvent.type(screen.getByPlaceholderText(/what's on your mind/i), dump);
    await userEvent.click(screen.getByRole("button", { name: /plan it/i }));
    await userEvent.click(await screen.findByRole("button", { name: /start over/i }));
    // Back in the composer with the original dump intact (not wiped).
    expect(screen.getByPlaceholderText(/what's on your mind/i)).toHaveValue(dump);
  });

  it("disables Plan it while the field is empty", () => {
    renderCapture();
    expect(screen.getByRole("button", { name: /plan it/i })).toBeDisabled();
  });

  it("shows an error and returns to idle when parsing fails", async () => {
    vi.mocked(organize).mockRejectedValueOnce(new Error("Could not structure that. Try rephrasing."));
    renderCapture();
    await userEvent.type(screen.getByPlaceholderText(/what's on your mind/i), "Gym this evening.");
    await userEvent.click(screen.getByRole("button", { name: /plan it/i }));
    expect(await screen.findByText(/could not structure/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /plan it/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add \d+ tasks?/i })).not.toBeInTheDocument();
  });

  it("shows the Dayspark wordmark header", () => {
    renderCapture();
    expect(screen.getByText("Day")).toBeInTheDocument();
    expect(screen.getByText("spark")).toBeInTheDocument();
  });

  it("shows the 'Try an example' chip on first run", () => {
    localStorage.clear();
    renderCapture();
    expect(screen.getByRole("button", { name: /try an example/i })).toBeInTheDocument();
  });

  it("hides the first-run chip once the profile has organized before", () => {
    localStorage.clear();
    const service = new LocalAuthService();
    service.startGuest();
    service.markOrganized();
    render(
      <AuthProvider service={service}>
        <SaveNudgeProvider>
          <TaskStoreProvider store={new MemoryTaskStore()}>
            <CaptureFlow />
          </TaskStoreProvider>
        </SaveNudgeProvider>
      </AuthProvider>,
    );
    expect(screen.queryByRole("button", { name: /try an example/i })).not.toBeInTheDocument();
  });

  it("blocks Plan it with the limit sheet when a non-Pro user is out of inputs", async () => {
    localStorage.clear();
    vi.mocked(organize).mockClear();
    const service = new LocalAuthService();
    const guest = service.startGuest();
    // Pre-exhaust today's usage for this profile (default limit 3).
    // Use the same local-date source as CaptureFlow (todayISO), not UTC — near
    // local midnight, `new Date().toISOString()` disagrees with the app's local date.
    const today = todayISO();
    localStorage.setItem(profileKey(USAGE_KEY, guest.id), JSON.stringify({ date: today, count: 3 }));
    renderCaptureWith(service);
    await userEvent.type(screen.getByLabelText(/brain dump/i), "something");
    await userEvent.click(screen.getByRole("button", { name: /plan it/i }));
    expect(await screen.findByText(/out of ai plans for today/i)).toBeInTheDocument();
    // Non-blocking, no parse runs: the gate short-circuits before organize() is called.
    expect(organize).not.toHaveBeenCalled();
  });

  it("reads the persisted limit on a fresh mount instead of the hardcoded default (regression)", async () => {
    // Regression coverage for a bug the M2 Task 8 e2e surfaced: `limit` used to be a
    // plain useState(3), so every fresh mount (reload/back-nav) forgot a configured
    // limit != 3 and under-counted the gate, letting one extra organize() call
    // through. It's now backed by usePersistentState("freeDailyInputs", 3), which
    // persists to the "planner.pref." + key seam (see preferenceStore.ts) — seed
    // that key directly here, the same way CaptureFlow reads it via usePersistentState.
    localStorage.clear();
    vi.mocked(organize).mockClear();
    const service = new LocalAuthService();
    const guest = service.startGuest();
    const today = todayISO();
    localStorage.setItem("planner.pref.freeDailyInputs", JSON.stringify(1)); // persisted limit: 1, not the hardcoded 3
    localStorage.setItem(profileKey(USAGE_KEY, guest.id), JSON.stringify({ date: today, count: 1 })); // budget already spent
    renderCaptureWith(service);
    await userEvent.type(screen.getByLabelText(/brain dump/i), "something");
    await userEvent.click(screen.getByRole("button", { name: /plan it/i }));
    // With the persisted limit of 1 and usage of 1, remaining is 0 → blocked. If
    // `limit` had reset to the hardcoded default of 3 (the bug), remaining would be
    // 3 - 1 = 2 and this would sail through to Review instead of blocking here.
    expect(await screen.findByText(/out of ai plans for today/i)).toBeInTheDocument();
    expect(organize).not.toHaveBeenCalled();
  });

  it("never gates or meters a Pro user, even with exhausted usage", async () => {
    localStorage.clear();
    const service = new LocalAuthService();
    const guest = service.startGuest();
    service.setTier("pro");
    // Same shape as the block-when-exhausted case, but for a Pro profile — the
    // gate (and the "N left" meter line) must not apply to Pro users at all.
    const today = todayISO();
    localStorage.setItem(profileKey(USAGE_KEY, guest.id), JSON.stringify({ date: today, count: 3 }));
    renderCaptureWith(service);
    expect(screen.queryByText(/plans left today/i)).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/brain dump/i), "something");
    await userEvent.click(screen.getByRole("button", { name: /plan it/i }));
    expect(await screen.findByRole("button", { name: /add 2 tasks/i })).toBeInTheDocument();
    expect(screen.queryByText(/out of ai plans for today/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/plans left today/i)).not.toBeInTheDocument();
  });

  it("increments the daily usage bucket after a successful organize", async () => {
    localStorage.clear();
    const service = new LocalAuthService();
    const guest = service.startGuest();
    renderCaptureWith(service);
    await userEvent.type(screen.getByLabelText(/brain dump/i), "Gym this evening. Read design book.");
    await userEvent.click(screen.getByRole("button", { name: /plan it/i }));
    await screen.findByRole("button", { name: /add 2 tasks/i });
    const stored = JSON.parse(localStorage.getItem(profileKey(USAGE_KEY, guest.id))!);
    expect(stored.count).toBe(1);
  });
});
