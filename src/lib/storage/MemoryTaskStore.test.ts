import { describe, it, expect } from "vitest";
import { MemoryTaskStore } from "./MemoryTaskStore";
import { createTask } from "../task/createTask";

const sample = () => createTask({ title: "Test task", doDate: "2026-07-20" }, { id: "id1", now: "2026-07-20T00:00:00Z", order: 0 });

describe("MemoryTaskStore", () => {
  it("defensively copies the seed array in constructor", () => {
    const seedArray = [sample()];
    const store = new MemoryTaskStore(seedArray);

    // Mutate the original seed array
    seedArray.push(createTask({ title: "Mutation", doDate: "2026-07-20" }, { id: "id2", now: "2026-07-20T00:00:00Z", order: 1 }));

    // The store should still have the original length (1), not affected by the mutation
    expect(store.load()).toHaveLength(1);
  });

  it("round-trips tasks through memory", () => {
    const store = new MemoryTaskStore();
    const task = sample();
    store.save([task]);
    expect(store.load()).toEqual([task]);
  });

  it("returns a copy from load() so mutations don't affect stored data", () => {
    const store = new MemoryTaskStore();
    const task = sample();
    store.save([task]);

    // Get the loaded array and mutate it
    const loaded = store.load();
    loaded.push(createTask({ title: "Another", doDate: "2026-07-20" }, { id: "id3", now: "2026-07-20T00:00:00Z", order: 2 }));

    // Subsequent load should still have only the original task
    expect(store.load()).toHaveLength(1);
  });
});
