/**
 * Opt-in evaluation of the real Gateway parser over the golden dataset.
 * Not part of `npm test` (it costs money and is non-deterministic). Run after
 * `vercel env pull` provisions the OIDC token:  npm run eval:ai
 *
 * The `eval:ai` script runs tsx with `--conditions=react-server` so the
 * `import "server-only"` guard in gatewayParser resolves to its empty module
 * (the same condition Next.js sets for Server Components) instead of throwing.
 */
import { GatewayTaskParser } from "@/lib/ai/gatewayParser";
import { parseCases, TODAY } from "@/lib/ai/fixtures/parseCases";

/**
 * Space out requests. The AI Gateway free tier rate-limits bursts (running all
 * cases back-to-back trips `GatewayRateLimitError`); a delay between cases keeps
 * a single-run eval under the limit. Tunable via EVAL_DELAY_MS.
 */
const DELAY_MS = Number(process.env.EVAL_DELAY_MS ?? 8000);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const model = process.env.EVAL_MODEL; // e.g. anthropic/claude-haiku-4.5 (direct SDK) — undefined uses the default
  const parser = new GatewayTaskParser({ today: TODAY, model, apiKey: process.env.AI_API_KEY });
  console.log(`Evaluating model: ${model ?? "(default) openai/gpt-4o-mini"}\n`);
  let passed = 0;
  for (const [i, c] of parseCases.entries()) {
    if (i > 0) await sleep(DELAY_MS);
    try {
      const tasks = await parser.parse(c.input);
      c.invariants(tasks);
      console.log(`✅ ${c.name}`);
      passed++;
    } catch (err) {
      console.error(`❌ ${c.name}: ${(err as Error).message}`);
    }
  }
  console.log(`\n${passed}/${parseCases.length} golden cases passed.`);
  process.exit(passed === parseCases.length ? 0 : 1);
}

void main();
