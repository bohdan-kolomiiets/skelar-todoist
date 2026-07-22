import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { TaskStoreProvider } from "./TaskStoreProvider";
import { useTasks } from "./useTasks";
import { MemoryTaskStore } from "../storage/MemoryTaskStore";

function wrapper(store: MemoryTaskStore) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <TaskStoreProvider store={store}>{children}</TaskStoreProvider>;
  };
}

describe("useTasks", () => {
  it("adds a task and persists it to the store", () => {
    const store = new MemoryTaskStore();
    const { result } = renderHook(() => useTasks(), { wrapper: wrapper(store) });
    act(() => {
      result.current.addTask({ title: "Write plan", doDate: "2026-07-20" });
    });
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].title).toBe("Write plan");
    expect(store.load()).toHaveLength(1);
  });

  it("toggleComplete flips status and stamps completedAt", () => {
    const store = new MemoryTaskStore();
    const { result } = renderHook(() => useTasks(), { wrapper: wrapper(store) });
    let id = "";
    act(() => {
      id = result.current.addTask({ title: "Done soon" }).id;
    });
    act(() => result.current.toggleComplete(id));
    expect(result.current.tasks[0].status).toBe("done");
    expect(result.current.tasks[0].completedAt).not.toBeNull();
    act(() => result.current.toggleComplete(id));
    expect(result.current.tasks[0].status).toBe("active");
    expect(result.current.tasks[0].completedAt).toBeNull();
  });

  it("moveTask to today sets doDate; to inbox clears it", () => {
    const store = new MemoryTaskStore();
    const { result } = renderHook(() => useTasks(), { wrapper: wrapper(store) });
    let id = "";
    act(() => {
      id = result.current.addTask({ title: "Movable", doDate: null }).id;
    });
    act(() => result.current.moveTask(id, "today"));
    expect(result.current.tasks[0].doDate).not.toBeNull();
    act(() => result.current.moveTask(id, "inbox"));
    expect(result.current.tasks[0].doDate).toBeNull();
  });

  it("addTasks commits a parsed batch", () => {
    const store = new MemoryTaskStore();
    const { result } = renderHook(() => useTasks(), { wrapper: wrapper(store) });
    act(() => {
      result.current.addTasks([{ title: "a" }, { title: "b" }]);
    });
    expect(result.current.tasks).toHaveLength(2);
  });

  it("commits two mutations in the same tick without losing either (stale-closure regression)", () => {
    const store = new MemoryTaskStore();
    const { result } = renderHook(() => useTasks(), { wrapper: wrapper(store) });
    act(() => {
      result.current.addTask({ title: "a" });
      result.current.addTask({ title: "b" });
    });
    expect(result.current.tasks.map((t) => t.title)).toEqual(["a", "b"]);
    expect(store.load()).toHaveLength(2);
  });

  it("clears needsDate once a task is dated, and does not resurrect it when undated again", () => {
    const store = new MemoryTaskStore();
    const { result } = renderHook(() => useTasks(), { wrapper: wrapper(store) });
    let id = "";
    act(() => {
      id = result.current.addTask({ title: "Someday-ish", doDate: null }).id;
    });
    act(() => result.current.updateTask(id, { needsDate: true }));
    expect(result.current.tasks[0].needsDate).toBe(true);

    // Resolving via the editor (setting a real doDate) must clear needsDate.
    act(() => result.current.updateTask(id, { doDate: "2026-07-25" }));
    expect(result.current.tasks[0].needsDate).toBe(false);

    // Clearing the date again must NOT resurrect needsDate — task goes to Someday, not Needs-a-date.
    act(() => result.current.updateTask(id, { doDate: null }));
    expect(result.current.tasks[0].needsDate).toBe(false);
  });

  it("moveTask to today clears needsDate", () => {
    const store = new MemoryTaskStore();
    const { result } = renderHook(() => useTasks(), { wrapper: wrapper(store) });
    let id = "";
    act(() => {
      id = result.current.addTask({ title: "Vague timing", doDate: null }).id;
    });
    act(() => result.current.updateTask(id, { needsDate: true }));
    expect(result.current.tasks[0].needsDate).toBe(true);

    act(() => result.current.moveTask(id, "today"));
    expect(result.current.tasks[0].needsDate).toBe(false);
    expect(result.current.tasks[0].doDate).not.toBeNull();
  });

  it("persists toggleComplete and moveTask to the store, not just React state", () => {
    const store = new MemoryTaskStore();
    const { result } = renderHook(() => useTasks(), { wrapper: wrapper(store) });
    let id = "";
    act(() => {
      id = result.current.addTask({ title: "Persisted", doDate: "2026-07-20" }).id;
    });

    act(() => result.current.toggleComplete(id));
    expect(store.load()[0].status).toBe("done");

    act(() => result.current.moveTask(id, "inbox"));
    expect(store.load()[0].doDate).toBeNull();
  });
});
