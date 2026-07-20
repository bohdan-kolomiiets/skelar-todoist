import { describe, it, expect, beforeEach } from "vitest";
import { LocalTaskStore } from "./LocalTaskStore";
import { createTask } from "../task/createTask";

const sample = () => createTask({ title: "Persist me", doDate: "2026-07-20" }, { id: "id1", now: "2026-07-20T00:00:00Z", order: 0 });

describe("LocalTaskStore", () => {
  beforeEach(() => localStorage.clear());

  it("returns [] when nothing is stored", () => {
    expect(new LocalTaskStore().load()).toEqual([]);
  });

  it("round-trips tasks through localStorage", () => {
    const store = new LocalTaskStore();
    store.save([sample()]);
    expect(new LocalTaskStore().load()).toEqual([sample()]);
  });

  it("returns [] and does not throw on corrupt JSON", () => {
    localStorage.setItem("planner.tasks.v1", "{not json");
    expect(new LocalTaskStore().load()).toEqual([]);
  });

  it("isolates data by key", () => {
    new LocalTaskStore("a").save([sample()]);
    expect(new LocalTaskStore("b").load()).toEqual([]);
  });
});
