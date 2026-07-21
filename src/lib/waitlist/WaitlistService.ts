export type Feature = "voice";

export interface WaitlistLead {
  email: string;
  feature: Feature;
  createdAt: string; // ISO
  userId?: string;
}

/** Swappable fake-door waitlist (PRODUCT §16). A real backend implements the same shape. */
export interface WaitlistService {
  join(lead: { email: string; feature: Feature; userId?: string }): void;
  hasJoined(feature: Feature): boolean;
  getLead(feature: Feature): WaitlistLead | null;
  recordInterest(feature: Feature): void; // a mic tap — the demand signal
  interestCount(feature: Feature): number;
}
