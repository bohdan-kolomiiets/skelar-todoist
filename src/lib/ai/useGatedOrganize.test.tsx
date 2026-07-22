import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { LocalAuthService } from "@/lib/auth/LocalAuthService";
import { profileKey } from "@/lib/profile/profileKey";
import { USAGE_KEY } from "@/lib/usage/LocalUsageService";
import { todayISO } from "@/lib/date/clock";
import { useGatedOrganize } from "./useGatedOrganize";
import * as client from "./organizeClient";

function wrap(service: LocalAuthService) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <AuthProvider service={service}>{children}</AuthProvider>;
  };
}

describe("useGatedOrganize", () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  it("blocks (no parse) when a non-Pro user is out of inputs", async () => {
    const service = new LocalAuthService();
    const guest = service.startGuest();
    localStorage.setItem(profileKey(USAGE_KEY, guest.id), JSON.stringify({ date: todayISO(), count: 3 }));
    const spy = vi.spyOn(client, "organize");
    const { result } = renderHook(() => useGatedOrganize(), { wrapper: wrap(service) });
    let out: unknown;
    await act(async () => { out = await result.current.run("something"); });
    expect(out).toEqual({ status: "blocked" });
    expect(spy).not.toHaveBeenCalled();
    expect(result.current.limitOpen).toBe(true);
  });

  it("returns empty on a 0-task parse and still counts the input", async () => {
    const service = new LocalAuthService();
    const guest = service.startGuest();
    vi.spyOn(client, "organize").mockResolvedValue({ tasks: [], degraded: false, freeDailyInputs: 3 });
    const { result } = renderHook(() => useGatedOrganize(), { wrapper: wrap(service) });
    let out: unknown;
    await act(async () => { out = await result.current.run("gibberish"); });
    expect(out).toEqual({ status: "empty" });
    expect(JSON.parse(localStorage.getItem(profileKey(USAGE_KEY, guest.id))!).count).toBe(1);
  });
});
