import "server-only";
import { generateText, Output } from "ai";
import type { ParsedTask } from "@/lib/task/types";
import { todayISO } from "@/lib/date/clock";
import type { TaskParser } from "./parser";
import { modelTaskSchema } from "./schema";
import { buildSystemPrompt } from "./prompt";

/** Real parser via the Vercel AI Gateway. Runs server-side only (holds the credential). */
export class GatewayTaskParser implements TaskParser {
  private today: string;
  private knownTags: string[];
  private model: string;
  constructor(deps: { today?: string; knownTags?: string[]; model?: string } = {}) {
    this.today = deps.today ?? todayISO();
    this.knownTags = deps.knownTags ?? [];
    // openai/gpt-4o-mini is available on the AI Gateway free tier (Haiku 4.5 is gated →
    // 403 RestrictedModelsError). Strong at structured field extraction; native structured
    // outputs keep the zod contract enforced. See issue #4 (P1) for the decision.
    this.model = deps.model ?? "openai/gpt-4o-mini";
  }

  async parse(text: string): Promise<ParsedTask[]> {
    if (!text.trim()) return [];
    const { output } = await generateText({
      model: this.model,
      system: buildSystemPrompt({ today: this.today, knownTags: this.knownTags }),
      prompt: text,
      output: Output.array({ element: modelTaskSchema }),
    });
    return output as ParsedTask[];
  }
}
