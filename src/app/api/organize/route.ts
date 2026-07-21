import { NextResponse } from "next/server";
import { resolveAiMode } from "@/lib/ai/mode";
import { parsedTasksSchema } from "@/lib/ai/schema";
import { FakeTaskParser } from "@/lib/ai/fakeParser";
import { GatewayTaskParser } from "@/lib/ai/gatewayParser";
import type { TaskParser } from "@/lib/ai/parser";

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
  const parser: TaskParser = mode === "real" ? new GatewayTaskParser() : new FakeTaskParser();

  try {
    const parsed = await parser.parse(text);
    const tasks = parsedTasksSchema.parse(parsed); // enforce the contract before it reaches the client
    return NextResponse.json({ tasks });
  } catch (err) {
    console.error("[/api/organize] parse failed:", err);
    return NextResponse.json({ error: "Could not structure that. Try rephrasing." }, { status: 502 });
  }
}
