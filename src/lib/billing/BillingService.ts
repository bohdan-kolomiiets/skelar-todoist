/** Swappable entitlements seam (PRODUCT §14). A real payment backend implements the same shape. */
export interface BillingService {
  isPro(): boolean;
  upgrade(): void;   // fake, instant
  downgrade(): void; // demo reset
}
