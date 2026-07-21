import { describe, it, expect, beforeEach } from "vitest";
import { getPreference, setPreference } from "./preferenceStore";

describe("preferenceStore", () => {
  beforeEach(() => localStorage.clear());

  it("returns undefined when the key has never been set", () => {
    expect(getPreference("missing")).toBeUndefined();
  });

  it("round-trips a stored value", () => {
    setPreference("showCompleted", true);
    expect(getPreference<boolean>("showCompleted")).toBe(true);
  });

  it("tolerates corrupt data by returning undefined", () => {
    localStorage.setItem("planner.pref.showCompleted", "{not json");
    expect(getPreference("showCompleted")).toBeUndefined();
  });
});
