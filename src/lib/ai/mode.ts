import { get } from "@vercel/edge-config";

export type AiMode = "fake" | "real";

/**
 * Runtime-switchable AI mode (no redeploy): Edge Config `aiMode` → env `AI_MODE`
 * → default 'fake'. Flip to 'fake' in the Vercel dashboard for an instant safe
 * fallback if the live model ever misbehaves during a demo.
 */
export async function resolveAiMode(): Promise<AiMode> {
  try {
    const fromEdge = await get<AiMode>("aiMode");
    if (fromEdge === "fake" || fromEdge === "real") return fromEdge;
  } catch {
    // Edge Config unavailable locally / unconfigured — fall through.
  }
  const fromEnv = process.env.AI_MODE;
  return fromEnv === "real" ? "real" : "fake";
}
