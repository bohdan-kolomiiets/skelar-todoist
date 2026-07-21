import { describe, it, expect, beforeEach } from "vitest";
import { LocalBillingService } from "./LocalBillingService";
import { LocalAuthService } from "../auth/LocalAuthService";

describe("LocalBillingService", () => {
  beforeEach(() => localStorage.clear());

  it("isPro is false for a fresh guest, true after upgrade, false after downgrade", () => {
    const auth = new LocalAuthService();
    auth.startGuest();
    const billing = new LocalBillingService(auth);
    expect(billing.isPro()).toBe(false);
    billing.upgrade();
    expect(billing.isPro()).toBe(true);
    expect(auth.current()?.tier).toBe("pro");
    billing.downgrade();
    expect(billing.isPro()).toBe(false);
    expect(auth.current()?.tier).toBe("free");
  });
});
