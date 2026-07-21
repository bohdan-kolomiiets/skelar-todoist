import type { AuthService, Profile, Registry, Tier } from "./types";
import { profileKey } from "../profile/profileKey";
import { TASKS_KEY } from "../storage/LocalTaskStore";
import { USAGE_KEY } from "../usage/LocalUsageService";
import { nowISO } from "../date/clock";

const REGISTRY_KEY = "planner.profiles.v1";
/** Base keys namespaced per profile (copied on sign-in). */
const PER_PROFILE_KEYS = [TASKS_KEY, USAGE_KEY];

/**
 * localStorage-backed identity. Namespaces per-profile buckets via profileKey and
 * copies the guest bucket into a new user bucket on sign-in (Approach A). Tolerates
 * missing/corrupt data by treating it as pre-guest.
 */
export class LocalAuthService implements AuthService {
  private has(): boolean {
    return typeof localStorage !== "undefined";
  }

  private read(): Registry | null {
    if (!this.has()) return null;
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Registry;
      if (parsed && typeof parsed === "object" && parsed.profiles) return parsed;
      return null;
    } catch {
      return null;
    }
  }

  private write(reg: Registry): void {
    if (this.has()) localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg));
  }

  /** One-time: adopt legacy unsuffixed task data as the guest bucket. Idempotent. */
  private migrateLegacyIfNeeded(): void {
    if (!this.has() || this.read()) return; // registry already exists → nothing to adopt
    const legacy = localStorage.getItem(TASKS_KEY);
    if (!legacy) return;
    localStorage.setItem(profileKey(TASKS_KEY, "guest"), legacy);
    this.write({ activeId: "guest", profiles: { guest: this.newGuest() } });
  }

  private newGuest(): Profile {
    return { id: "guest", tier: "guest", hasOrganizedOnce: false, hasSavedOnce: false, createdAt: nowISO() };
  }

  current(): Profile | null {
    this.migrateLegacyIfNeeded();
    const reg = this.read();
    if (!reg || !reg.activeId) return null;
    return reg.profiles[reg.activeId] ?? null;
  }

  startGuest(): Profile {
    const reg = this.read() ?? { activeId: null, profiles: {} };
    const guest = reg.profiles.guest ?? this.newGuest();
    reg.profiles.guest = guest;
    reg.activeId = "guest";
    this.write(reg);
    return guest;
  }

  signIn(input: { emailOrName: string }): Profile {
    this.migrateLegacyIfNeeded();
    const reg = this.read() ?? { activeId: null, profiles: {} };
    const from = reg.activeId ? reg.profiles[reg.activeId] : this.startGuestInto(reg);
    const isEmail = input.emailOrName.includes("@");
    const id = crypto.randomUUID();
    const profile: Profile = {
      id,
      tier: "free",
      email: isEmail ? input.emailOrName : undefined,
      name: isEmail ? undefined : input.emailOrName,
      hasOrganizedOnce: from?.hasOrganizedOnce ?? false,
      hasSavedOnce: from?.hasSavedOnce ?? false,
      createdAt: nowISO(),
    };
    // Copy-on-sign-in: carry the guest's buckets into the new user's namespace.
    if (from && this.has()) {
      for (const base of PER_PROFILE_KEYS) {
        const val = localStorage.getItem(profileKey(base, from.id));
        if (val !== null) localStorage.setItem(profileKey(base, id), val);
      }
    }
    reg.profiles[id] = profile;
    reg.activeId = id;
    this.write(reg);
    return profile;
  }

  private startGuestInto(reg: Registry): Profile {
    const guest = this.newGuest();
    reg.profiles.guest = guest;
    reg.activeId = "guest";
    return guest;
  }

  signOut(): void {
    const reg = this.read();
    if (!reg) return;
    if (!reg.profiles.guest) reg.profiles.guest = this.newGuest();
    reg.activeId = "guest";
    this.write(reg);
  }

  markOrganized(): void {
    this.patchActive({ hasOrganizedOnce: true });
  }

  markSaved(): void {
    this.patchActive({ hasSavedOnce: true });
  }

  setTier(tier: Tier): void {
    this.patchActive({ tier });
  }

  private patchActive(patch: Partial<Profile>): void {
    const reg = this.read();
    if (!reg || !reg.activeId) return;
    const p = reg.profiles[reg.activeId];
    if (!p) return;
    reg.profiles[reg.activeId] = { ...p, ...patch };
    this.write(reg);
  }
}
