import "server-only";
import { generateText, Output, type LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { ParsedTask } from "@/lib/task/types";
import { todayISO } from "@/lib/date/clock";
import type { TaskParser } from "./parser";
import { modelTaskSchema } from "./schema";
import { buildSystemPrompt } from "./prompt";

/**
 * Real parser for structured task extraction. Runs server-side only (holds the credential).
 *
 * Provider routing (see issue #4): `anthropic/*` models run on the user's **own** Anthropic
 * account via the direct `@ai-sdk/anthropic` SDK, bypassing the Vercel AI Gateway — whose BYOK
 * is a paid-tier feature. Every other model routes through the AI Gateway by plain model string
 * (managed, free credits). `openai/gpt-4o-mini` is the no-key default.
 */
export class GatewayTaskParser implements TaskParser {
  private today: string;
  private knownTags: string[];
  private model: string;
  private apiKey?: string;
  constructor(deps: { today?: string; knownTags?: string[]; model?: string; apiKey?: string } = {}) {
    this.today = deps.today ?? todayISO();
    this.knownTags = deps.knownTags ?? [];
    this.model = deps.model ?? "openai/gpt-4o-mini";
    // The user's Anthropic key (route passes process.env.AI_API_KEY). Used for the direct
    // anthropic/* path; ignored for gateway models.
    this.apiKey = deps.apiKey;
  }

  /** Resolve the configured slug to a model: direct Anthropic SDK for `anthropic/*` (+ key),
   *  else the plain gateway string. */
  private resolveModel(): LanguageModel {
    if (this.model.startsWith("anthropic/") && this.apiKey) {
      // Gateway slug → direct model id: drop the provider prefix, version dot → hyphen.
      // e.g. "anthropic/claude-haiku-4.5" → "claude-haiku-4-5".
      const id = this.model.slice("anthropic/".length).replace(/\./g, "-");
      return createAnthropic({ apiKey: this.apiKey })(id);
    }
    return this.model;
  }

  async parse(text: string): Promise<ParsedTask[]> {
    if (!text.trim()) return [];
    const { output } = await generateText({
      model: this.resolveModel(),
      system: buildSystemPrompt({ today: this.today, knownTags: this.knownTags }),
      prompt: text,
      output: Output.array({ element: modelTaskSchema }),
    });
    return output as ParsedTask[];
  }
}
