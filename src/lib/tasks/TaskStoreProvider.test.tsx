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
});
