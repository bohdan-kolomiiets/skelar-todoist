import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useIsHydrated } from "./useIsHydrated";

describe("useIsHydrated", () => {
  it("is true after the client render commits", () => {
    const { result } = renderHook(() => useIsHydrated());
    expect(result.current).toBe(true); // renderHook runs a client (CSR) render
  });
});
