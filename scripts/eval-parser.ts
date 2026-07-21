/**
 * Opt-in evaluation of the real Gateway parser over the golden dataset.
 * Not part of `npm test` (it costs money and is non-deterministic). Run after
 * `vercel env pull` provisions the OIDC token:  npm run eval:ai
 */
import { GatewayTaskParser } from "@/lib/ai/gatewayParser";
import { parseCases, TODAY } from "@/lib/ai/fixtures/parseCases";

async function main() {
  const parser = new GatewayTaskParser({ today: TODAY });
  let passed = 0;
  for (const c of parseCases) {
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
