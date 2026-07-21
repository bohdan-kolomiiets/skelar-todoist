import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./useAuth";
import { LocalAuthService } from "./LocalAuthService";

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider service={new LocalAuthService()}>{children}</AuthProvider>;
}

describe("useAuth", () => {
  it("starts pre-guest (null) then reflects startGuest", () => {
    localStorage.clear();
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.profile).toBeNull();
    act(() => result.current.startGuest());
    expect(result.current.profile?.id).toBe("guest");
  });

  it("signIn flips the profile to a free tier reactively", () => {
    localStorage.clear();
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.startGuest());
    act(() => result.current.signIn({ emailOrName: "sam@example.com" }));
    expect(result.current.profile?.tier).toBe("free");
  });

  it("markOrganized updates the profile flag reactively", () => {
    localStorage.clear();
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.startGuest());
    act(() => result.current.markOrganized());
    expect(result.current.profile?.hasOrganizedOnce).toBe(true);
  });
});
