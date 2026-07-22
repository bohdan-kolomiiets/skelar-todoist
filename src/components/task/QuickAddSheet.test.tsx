import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { LocalAuthService } from "@/lib/auth/LocalAuthService";
import { TaskStoreProvider } from "@/lib/tasks/TaskStoreProvider";
import { MemoryTaskStore } from "@/lib/storage/MemoryTaskStore";
import { QuickAddSheet } from "./QuickAddSheet";
import * as client from "@/lib/ai/organizeClient";

function renderSheet(onClose = vi.fn(), defaultDoDate: string | null = null) {
  const service = new LocalAuthService();
  service.startGuest();
  return render(
    <AuthProvider service={service}>
      <TaskStoreProvider store={new MemoryTaskStore()}>
        <QuickAddSheet open onClose={onClose} defaultDoDate={defaultDoDate} />
      </TaskStoreProvider>
    </AuthProvider>,
  );
}

describe("QuickAddSheet", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("keeps focus on the text field while typing", async () => {
    renderSheet();
    const field = screen.getByLabelText(/new task/i);
    field.focus();
    await userEvent.type(field, "b");
    expect(field).toHaveFocus();
    await userEvent.type(field, "c");
    expect(field).toHaveFocus();
  });

  it("shows the remaining AI-plan counter for non-Pro users", () => {
    renderSheet();
    expect(screen.getByText(/3 of 3 AI plans left today/i)).toBeInTheDocument();
  });

  it("Enter manually opens a blank editor", async () => {
    renderSheet();
    await userEvent.click(screen.getByRole("button", { name: /enter manually/i }));
    expect(screen.getByRole("dialog", { name: /new task/i })).toBeInTheDocument();
  });

  it("Parse with AI on a single task opens the prefilled editor", async () => {
    vi.spyOn(client, "organize").mockResolvedValue({
      tasks: [{ title: "Book dentist", doDate: null, priority: "none", tags: [] }],
      degraded: false,
      freeDailyInputs: 3,
    });
    renderSheet();
    await userEvent.type(screen.getByLabelText(/new task/i), "book dentist");
    await userEvent.click(screen.getByRole("button", { name: /parse with ai/i }));
    expect(await screen.findByDisplayValue(/book dentist/i)).toBeInTheDocument(); // editor prefilled
  });

  it("Parse with AI on several tasks opens Review", async () => {
    vi.spyOn(client, "organize").mockResolvedValue({
      tasks: [
        { title: "A", doDate: null, priority: "none", tags: [] },
        { title: "B", doDate: null, priority: "none", tags: [] },
      ],
      degraded: false,
      freeDailyInputs: 3,
    });
    renderSheet();
    await userEvent.type(screen.getByLabelText(/new task/i), "a and b");
    await userEvent.click(screen.getByRole("button", { name: /parse with ai/i }));
    expect(await screen.findByRole("button", { name: /add 2 tasks/i })).toBeInTheDocument();
  });
});
