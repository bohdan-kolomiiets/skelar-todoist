import { describe, it, expect, beforeEach } from "vitest";
import { LocalWaitlistService, WAITLIST_KEY } from "./LocalWaitlistService";

describe("LocalWaitlistService", () => {
  beforeEach(() => localStorage.clear());

  it("has not joined before joining", () => {
    const w = new LocalWaitlistService();
    expect(w.hasJoined("voice")).toBe(false);
    expect(w.getLead("voice")).toBeNull();
  });

  it("records a join with the lead shape and persists it", () => {
    new LocalWaitlistService().join({ email: "sam@example.com", feature: "voice", userId: "u1" });
    const w = new LocalWaitlistService();
    expect(w.hasJoined("voice")).toBe(true);
    const lead = w.getLead("voice");
    expect(lead?.email).toBe("sam@example.com");
    expect(lead?.feature).toBe("voice");
    expect(lead?.userId).toBe("u1");
    expect(typeof lead?.createdAt).toBe("string");
  });

  it("keeps the earliest createdAt when joining twice", () => {
    const w = new LocalWaitlistService();
    w.join({ email: "a@example.com", feature: "voice" });
    const first = w.getLead("voice")!.createdAt;
    w.join({ email: "b@example.com", feature: "voice" });
    const lead = w.getLead("voice")!;
    expect(lead.email).toBe("b@example.com"); // latest email
    expect(lead.createdAt).toBe(first); // earliest timestamp preserved
  });

  it("counts interest taps independently of joining", () => {
    const w = new LocalWaitlistService();
    w.recordInterest("voice");
    w.recordInterest("voice");
    expect(w.interestCount("voice")).toBe(2);
    expect(w.hasJoined("voice")).toBe(false);
  });

  it("tolerates corrupt JSON as not-joined / zero interest", () => {
    localStorage.setItem(WAITLIST_KEY, "{not json");
    const w = new LocalWaitlistService();
    expect(w.hasJoined("voice")).toBe(false);
    expect(w.interestCount("voice")).toBe(0);
  });
});
