import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: push }) }));
vi.mock("@/lib/ai/organizeClient", () => ({
  organize: vi.fn().mockResolvedValue([
    { title: "Gym", doDate: null, timeOfDay: "evening" },
    { title: "Read design book", doDate: null },
  ]),
}));

import { CaptureFlow } from "./CaptureFlow";
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

  it("parses a dump and transitions to Review", async () => {
    renderFlow();
    await userEvent.type(screen.getByPlaceholderText(/what's on your mind/i), "Gym this evening. Read design book.");
    await userEvent.click(screen.getByRole("button", { name: /plan it/i }));
    expect(await screen.findByRole("button", { name: /add 2 tasks/i })).toBeInTheDocument();
  });

  it("disables Plan it while the field is empty", () => {
    renderFlow();
    expect(screen.getByRole("button", { name: /plan it/i })).toBeDisabled();
  });
});
