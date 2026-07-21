/** Swappable daily-usage meter (PRODUCT §14). A real backend implements the same shape. */
export interface UsageService {
  /** AI inputs used on local date `today` ("YYYY-MM-DD"). */
  count(today: string): number;
  /** Record one AI input for `today` (resets the stored count if the date rolled over). */
  increment(today: string): void;
  /** Remaining allowance for `today`, clamped to ≥ 0. */
  remaining(today: string, limit: number): number;
}
