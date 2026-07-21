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

/**
 * Default gateway model when nothing is configured. Needs no BYOK key, so a
 * misconfigured environment degrades to the managed model instead of a hard 403.
 */
export const DEFAULT_AI_MODEL = "openai/gpt-4o-mini";

/**
 * Which gateway model real mode uses: Edge Config `aiModel` → env `AI_MODEL`
 * → DEFAULT_AI_MODEL. Runtime-switchable without redeploy. A value must look like
 * a `provider/model` slug (contain "/") to be accepted, else we fall through.
 */
export async function resolveAiModel(): Promise<string> {
  try {
    const fromEdge = await get<string>("aiModel");
    if (typeof fromEdge === "string" && fromEdge.includes("/")) return fromEdge;
  } catch {
    // Edge Config unavailable locally / unconfigured — fall through.
  }
  const fromEnv = process.env.AI_MODEL;
  if (typeof fromEnv === "string" && fromEnv.includes("/")) return fromEnv;
  return DEFAULT_AI_MODEL;
}
