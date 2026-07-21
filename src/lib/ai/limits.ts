import { get } from "@vercel/edge-config";

/** Hardcoded fallback when nothing is configured (PRODUCT §14 demo default). */
export const FREE_DAILY_INPUTS_FALLBACK = 3;

function asPositiveInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Free-tier daily AI-input allowance: Edge Config `freeDailyInputs` → env
 * `FREE_DAILY_INPUTS` → fallback 3. Runtime-tunable without redeploy, exactly
 * like `resolveAiMode`. Non-positive / non-integer values are ignored.
 */
export async function resolveFreeDailyInputs(): Promise<number> {
  try {
    const fromEdge = asPositiveInt(await get<number | string>("freeDailyInputs"));
    if (fromEdge !== null) return fromEdge;
  } catch {
    // Edge Config unavailable locally / unconfigured — fall through.
  }
  const fromEnv = asPositiveInt(process.env.FREE_DAILY_INPUTS);
  return fromEnv ?? FREE_DAILY_INPUTS_FALLBACK;
}
