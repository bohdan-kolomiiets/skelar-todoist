import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePersistentState } from "./usePersistentState";

describe("usePersistentState", () => {
  beforeEach(() => localStorage.clear());

  it("starts from the default when nothing is stored", () => {
    const { result } = renderHook(() => usePersistentState("showCompleted", false));
    expect(result.current[0]).toBe(false);
  });

  it("persists updates so a fresh mount reads them back", () => {
    const first = renderHook(() => usePersistentState("showCompleted", false));
    act(() => first.result.current[1](true));
    expect(first.result.current[0]).toBe(true);
    first.unmount();

    // A brand-new mount (simulates a refresh / tab switch) sees the stored value.
    const second = renderHook(() => usePersistentState("showCompleted", false));
    expect(second.result.current[0]).toBe(true);
  });
});
