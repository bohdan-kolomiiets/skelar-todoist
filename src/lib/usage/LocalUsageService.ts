import type { UsageService } from "./UsageService";

/** Base key, namespaced per profile by the caller via profileKey(USAGE_KEY, id). */
export const USAGE_KEY = "planner.usage.v1";

interface Stored {
  date: string; // "YYYY-MM-DD"
  count: number;
}

/**
 * localStorage daily meter. The count belongs to a single local date; any read for
 * a different date is 0 (implicit local-midnight reset), and the next increment
 * starts that new date at 1. Tolerates missing/corrupt data as 0.
 */
export class LocalUsageService implements UsageService {
  constructor(private key: string) {}

  private read(): Stored | null {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(this.key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Stored;
      if (parsed && typeof parsed.date === "string" && typeof parsed.count === "number") return parsed;
      return null;
    } catch {
      return null;
    }
  }

  private write(value: Stored): void {
    if (typeof localStorage !== "undefined") localStorage.setItem(this.key, JSON.stringify(value));
  }

  count(today: string): number {
    const s = this.read();
    return s && s.date === today ? s.count : 0;
  }

  increment(today: string): void {
    this.write({ date: today, count: this.count(today) + 1 });
  }

  remaining(today: string, limit: number): number {
    return Math.max(0, limit - this.count(today));
  }
}
