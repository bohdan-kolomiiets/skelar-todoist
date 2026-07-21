/**
 * Swappable persistence seam for small UI preferences (PRODUCT §17 storage-is-
 * swappable convention — a real backend can replace this without touching the UI).
 * SSR-safe and corruption-tolerant, like LocalTaskStore: reads never throw and
 * return `undefined` when the value is missing or unparseable, so callers just
 * fall back to their default.
 */
const PREFIX = "planner.pref.";

export function getPreference<T>(key: string): T | undefined {
  if (typeof localStorage === "undefined") return undefined;
  const raw = localStorage.getItem(PREFIX + key);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function setPreference<T>(key: string, value: T): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}
