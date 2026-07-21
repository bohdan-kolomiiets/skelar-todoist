import { describe, it, expect } from "vitest";
import { profileKey } from "./profileKey";

describe("profileKey", () => {
  it("suffixes the base key with the profile id", () => {
    expect(profileKey("planner.tasks.v1", "guest")).toBe("planner.tasks.v1:guest");
  });
  it("namespaces distinct profiles to distinct keys", () => {
    expect(profileKey("planner.tasks.v1", "abc")).not.toBe(profileKey("planner.tasks.v1", "guest"));
  });
});
