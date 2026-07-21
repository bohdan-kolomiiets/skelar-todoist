import type { AuthService } from "../auth/types";
import type { BillingService } from "./BillingService";

/** Entitlements are the profile's tier; upgrade/downgrade flip it via the AuthService seam. */
export class LocalBillingService implements BillingService {
  constructor(private auth: AuthService) {}
  isPro(): boolean {
    return this.auth.current()?.tier === "pro";
  }
  upgrade(): void {
    this.auth.setTier("pro");
  }
  downgrade(): void {
    this.auth.setTier("free");
  }
}
