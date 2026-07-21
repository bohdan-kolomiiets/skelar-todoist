import "server-only";
import { generateText, Output } from "ai";
import type { ParsedTask } from "@/lib/task/types";
import { todayISO } from "@/lib/date/clock";
import type { TaskParser } from "./parser";
import { parsedTaskSchema } from "./schema";
import { buildSystemPrompt } from "./prompt";

/** Real parser via the Vercel AI Gateway. Runs server-side only (holds the credential). */
export class GatewayTaskParser implements TaskParser {
  private today: string;
  private knownTags: string[];
  private model: string;
  constructor(deps: { today?: string; knownTags?: string[]; model?: string } = {}) {
    this.today = deps.today ?? todayISO();
    this.knownTags = deps.knownTags ?? [];
    this.model = deps.model ?? "anthropic/claude-haiku-4.5";
  }

  async parse(text: string): Promise<ParsedTask[]> {
    if (!text.trim()) return [];
    const { output } = await generateText({
      model: this.model,
      system: buildSystemPrompt({ today: this.today, knownTags: this.knownTags }),
      prompt: text,
      output: Output.array({ element: parsedTaskSchema }),
    });
    return output as ParsedTask[];
  }
}
