import { describe, it, expect, vi } from "vitest";
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
  }),
}));

import { CaptureFlow } from "./CaptureFlow";
import { organize } from "@/lib/ai/organizeClient";
import { TaskStoreProvider } from "@/lib/tasks/TaskStoreProvider";
import { MemoryTaskStore } from "@/lib/storage/MemoryTaskStore";

const renderFlow = () =>
  render(
    <TaskStoreProvider store={new MemoryTaskStore()}>
      <CaptureFlow />
    </TaskStoreProvider>,
  );

describe("CaptureFlow", () => {
  it("shows the composer and the example chip on first run", () => {
    renderFlow();
    expect(screen.getByPlaceholderText(/what's on your mind/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try an example/i })).toBeInTheDocument();
  });

  it("shows a wand icon on the example chip, not an emoji (issue #4 #7)", () => {
    renderFlow();
    const chip = screen.getByRole("button", { name: /try an example/i });
    const icon = chip.querySelector("svg");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("shows a help-circle icon on the Tips button (issue #4 #8)", () => {
    renderFlow();
    const tips = screen.getByRole("button", { name: /tips/i });
    const icon = tips.querySelector("svg");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("opens the Tips guide when the Tips button is tapped (issue #4 #8)", async () => {
    renderFlow();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /tips/i }));
    expect(await screen.findByRole("dialog", { name: /how i read your dump/i })).toBeInTheDocument();
  });

  it("opens the voice coming-soon sheet when the mic is tapped (issue #4 #9)", async () => {
    renderFlow();
    await userEvent.click(screen.getByRole("button", { name: /voice input/i }));
    expect(await screen.findByRole("dialog", { name: /voice capture/i })).toBeInTheDocument();
  });

  it("shows a spark on Plan it to signal the AI moment (P1)", () => {
    renderFlow();
    const planIt = screen.getByRole("button", { name: /plan it/i });
    expect(planIt.querySelector("svg")).toBeInTheDocument();
  });

  it("parses a dump and transitions to Review", async () => {
    renderFlow();
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
    });
    renderFlow();
    await userEvent.type(screen.getByPlaceholderText(/what's on your mind/i), "Gym this evening.");
    await userEvent.click(screen.getByRole("button", { name: /plan it/i }));
    // Still lands in Review with a usable plan…
    expect(await screen.findByRole("button", { name: /add 1 task/i })).toBeInTheDocument();
    // …plus an honest, non-blocking notice that the real AI was unavailable.
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
  });

  it("keeps the brain-dump text after Start over so it can be tweaked and re-run", async () => {
    const dump = "Gym this evening. Read design book.";
    renderFlow();
    await userEvent.type(screen.getByPlaceholderText(/what's on your mind/i), dump);
    await userEvent.click(screen.getByRole("button", { name: /plan it/i }));
    await userEvent.click(await screen.findByRole("button", { name: /start over/i }));
    // Back in the composer with the original dump intact (not wiped).
    expect(screen.getByPlaceholderText(/what's on your mind/i)).toHaveValue(dump);
  });

  it("disables Plan it while the field is empty", () => {
    renderFlow();
    expect(screen.getByRole("button", { name: /plan it/i })).toBeDisabled();
  });

  it("shows an error and returns to idle when parsing fails", async () => {
    vi.mocked(organize).mockRejectedValueOnce(new Error("Could not structure that. Try rephrasing."));
    renderFlow();
    await userEvent.type(screen.getByPlaceholderText(/what's on your mind/i), "Gym this evening.");
    await userEvent.click(screen.getByRole("button", { name: /plan it/i }));
    expect(await screen.findByText(/could not structure/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /plan it/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add \d+ tasks?/i })).not.toBeInTheDocument();
  });

  it("shows the Dayspark wordmark header", () => {
    renderFlow();
    expect(screen.getByText("Day")).toBeInTheDocument();
    expect(screen.getByText("spark")).toBeInTheDocument();
  });
});
