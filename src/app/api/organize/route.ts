import { NextResponse } from "next/server";
import { resolveAiMode, resolveAiModel } from "@/lib/ai/mode";
import { parsedTasksSchema } from "@/lib/ai/schema";
import { FakeTaskParser } from "@/lib/ai/fakeParser";
import { GatewayTaskParser } from "@/lib/ai/gatewayParser";
import type { ParsedTask } from "@/lib/task/types";

/**
 * The AI parse boundary. Secrets/credentials live here, never client-side.
 * One `Plan it` tap = one call here (the metered "input" in the later freemium plan).
 */
export async function POST(request: Request): Promise<Response> {
  let text: unknown;
  try {
    ({ text } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Please enter something to plan." }, { status: 400 });
  }

  const mode = await resolveAiMode();
  console.log(`[/api/organize] aiMode=${mode}`);

  try {
    let parsed: ParsedTask[];
    let degraded = false;
    if (mode === "real") {
      const model = await resolveAiModel();
      console.log(`[/api/organize] aiModel=${model}`);
      try {
        parsed = await new GatewayTaskParser({ model, apiKey: process.env.AI_API_KEY }).parse(text);
      } catch (err) {
        // Real AI unavailable (gateway/model/billing/timeout). Stay demo-safe:
        // fall back to the deterministic parser so the user still gets a plan,
        // and flag it so the UI can be honest instead of failing outright.
        console.error("[/api/organize] real parser unavailable — falling back to fake:", err);
        parsed = await new FakeTaskParser().parse(text);
        degraded = true;
      }
    } else {
      parsed = await new FakeTaskParser().parse(text);
    }
    const tasks = parsedTasksSchema.parse(parsed); // enforce the contract before it reaches the client
    return NextResponse.json({ tasks, degraded });
  } catch (err) {
    // Reached only when the deterministic fallback itself fails — a genuine internal
    // problem, not bad user input. Don't tell the user to "rephrase".
    console.error(`[/api/organize] parse failed (aiMode=${mode}):`, err);
    return NextResponse.json(
      { error: "Something went wrong organizing that. Please try again." },
      { status: 502 },
    );
  }
}
