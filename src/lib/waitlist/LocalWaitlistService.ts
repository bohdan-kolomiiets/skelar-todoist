import type { Feature, WaitlistLead, WaitlistService } from "./WaitlistService";
import { nowISO } from "../date/clock";

export const WAITLIST_KEY = "planner.waitlist.v1";

interface Store {
  leads: Partial<Record<Feature, WaitlistLead>>;
  interest: Partial<Record<Feature, number>>;
}

/** Device-global localStorage waitlist. Faked demand test — never sends email, never creates an account. */
export class LocalWaitlistService implements WaitlistService {
  constructor(private key: string = WAITLIST_KEY) {}

  private read(): Store {
    const empty: Store = { leads: {}, interest: {} };
    if (typeof localStorage === "undefined") return empty;
    const raw = localStorage.getItem(this.key);
    if (!raw) return empty;
    try {
      const parsed = JSON.parse(raw) as Store;
      return {
        leads: parsed?.leads ?? {},
        interest: parsed?.interest ?? {},
      };
    } catch {
      return empty;
    }
  }

  private write(store: Store): void {
    if (typeof localStorage !== "undefined") localStorage.setItem(this.key, JSON.stringify(store));
  }

  join(lead: { email: string; feature: Feature; userId?: string }): void {
    const store = this.read();
    const existing = store.leads[lead.feature];
    store.leads[lead.feature] = {
      email: lead.email,
      feature: lead.feature,
      userId: lead.userId,
      createdAt: existing?.createdAt ?? nowISO(),
    };
    this.write(store);
  }

  hasJoined(feature: Feature): boolean {
    return this.read().leads[feature] != null;
  }

  getLead(feature: Feature): WaitlistLead | null {
    return this.read().leads[feature] ?? null;
  }

  recordInterest(feature: Feature): void {
    const store = this.read();
    store.interest[feature] = (store.interest[feature] ?? 0) + 1;
    this.write(store);
  }

  interestCount(feature: Feature): number {
    return this.read().interest[feature] ?? 0;
  }
}
