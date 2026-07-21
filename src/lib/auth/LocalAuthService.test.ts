import { describe, it, expect, beforeEach } from "vitest";
import { LocalAuthService } from "./LocalAuthService";
import { profileKey } from "../profile/profileKey";
import { TASKS_KEY } from "../storage/LocalTaskStore";

const guestTasksKey = profileKey(TASKS_KEY, "guest");

describe("LocalAuthService", () => {
  beforeEach(() => localStorage.clear());

  it("returns null before any profile exists (pre-guest)", () => {
    expect(new LocalAuthService().current()).toBeNull();
  });

  it("startGuest creates and returns a persisted guest profile", () => {
    const auth = new LocalAuthService();
    const guest = auth.startGuest();
    expect(guest.id).toBe("guest");
    expect(guest.tier).toBe("guest");
    expect(guest.hasOrganizedOnce).toBe(false);
    expect(guest.hasSavedOnce).toBe(false);
    // Persisted: a fresh instance sees it.
    expect(new LocalAuthService().current()?.id).toBe("guest");
  });

  it("markOrganized / markSaved flip persisted flags on the active profile", () => {
    const auth = new LocalAuthService();
    auth.startGuest();
    auth.markOrganized();
    auth.markSaved();
    const p = new LocalAuthService().current();
    expect(p?.hasOrganizedOnce).toBe(true);
    expect(p?.hasSavedOnce).toBe(true);
  });

  it("signIn mints a free profile and COPIES the guest task bucket into it", () => {
    const auth = new LocalAuthService();
    auth.startGuest();
    localStorage.setItem(guestTasksKey, JSON.stringify([{ id: "t1", title: "Kept" }]));
    const user = auth.signIn({ emailOrName: "sam@example.com" });
    expect(user.tier).toBe("free");
    expect(user.email).toBe("sam@example.com");
    expect(user.id).not.toBe("guest");
    // Copied into the user's bucket…
    expect(localStorage.getItem(profileKey(TASKS_KEY, user.id))).toContain("Kept");
    // …and the guest bucket survives (sign-out returns to it).
    expect(localStorage.getItem(guestTasksKey)).toContain("Kept");
    expect(new LocalAuthService().current()?.id).toBe(user.id);
  });

  it("signIn treats a value without '@' as a name, not an email", () => {
    const auth = new LocalAuthService();
    auth.startGuest();
    const user = auth.signIn({ emailOrName: "Sam" });
    expect(user.name).toBe("Sam");
    expect(user.email).toBeUndefined();
  });

  it("signOut returns to the guest profile", () => {
    const auth = new LocalAuthService();
    auth.startGuest();
    auth.signIn({ emailOrName: "sam@example.com" });
    auth.signOut();
    expect(auth.current()?.id).toBe("guest");
  });

  it("setTier upgrades the active profile", () => {
    const auth = new LocalAuthService();
    auth.startGuest();
    auth.signIn({ emailOrName: "sam@example.com" });
    auth.setTier("pro");
    expect(auth.current()?.tier).toBe("pro");
  });

  it("adopts legacy unsuffixed task data as the guest bucket on first touch", () => {
    localStorage.setItem(TASKS_KEY, JSON.stringify([{ id: "legacy", title: "Old" }]));
    const auth = new LocalAuthService();
    const p = auth.current(); // migration runs on read
    expect(p?.id).toBe("guest");
    expect(localStorage.getItem(guestTasksKey)).toContain("Old");
  });

  it("does NOT create a profile when there is neither a registry nor legacy data", () => {
    const auth = new LocalAuthService();
    expect(auth.current()).toBeNull();
    expect(localStorage.getItem("planner.profiles.v1")).toBeNull();
  });
});
