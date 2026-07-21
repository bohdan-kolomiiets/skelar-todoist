# AI Provider/Model Switch (BYOK Anthropic) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the real-mode parser run on a runtime-selectable gateway model, and route `anthropic/*` on the user's own paid Anthropic account via request-scoped BYOK — so we bypass the free-tier 403 and rate limits.

**Architecture:** Two Edge Config knobs — `aiMode` (`fake`|`real`, unchanged) and a new `aiModel` (gateway slug). In real mode the route resolves `aiModel` and constructs `GatewayTaskParser({ model, byokKey: process.env.AI_API_KEY })`. The parser passes the key as `providerOptions.gateway.byok.anthropic`; the gateway applies it only to `anthropic/*` routing. The P1 fake-fallback + `degraded` UX is untouched, so a missing/invalid key degrades honestly.

**Tech Stack:** Next.js 16 route handler · AI SDK `ai@7.0.32` + `@ai-sdk/gateway@4.0.24` (transitive) · `@vercel/edge-config` · Vitest.

## Global Constraints

- **Switch = two knobs.** `aiMode` semantics unchanged (`fake`|`real`). New `aiModel` resolves `Edge Config "aiModel" → env AI_MODEL → default`.
- **Default model:** `openai/gpt-4o-mini` (needs no BYOK key — safe fallback).
- **Anthropic model:** `anthropic/claude-haiku-4.5`.
- **BYOK convention:** the key is armed by `process.env.AI_API_KEY` presence and passed as `providerOptions: { gateway: { byok: { anthropic: [{ apiKey }] } } }`; the gateway applies it only to `anthropic/*`. No third knob.
- **One output schema:** keep `modelTaskSchema` for every provider. Do not touch `parsedTaskSchema` / `createTask`.
- **Resilience untouched:** the real→fake fallback returning `{ tasks, degraded }` stays exactly as shipped in P1.
- **Model-slug guard:** an `aiModel` value must contain `/` to be accepted (else fall through).
- **Sweep before "done":** `npm run lint && npm run typecheck && npm test && npm run test:e2e`.
- **Commits:** conventional-commit style; end the message body with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: `resolveAiModel()` in the mode resolver

**Files:**
- Modify: `src/lib/ai/mode.ts`
- Test: `src/lib/ai/mode.test.ts`

**Interfaces:**
- Consumes: `@vercel/edge-config`'s `get`.
- Produces: `resolveAiModel(): Promise<string>` and `const DEFAULT_AI_MODEL = "openai/gpt-4o-mini"`.

- [ ] **Step 1: Write the failing tests** — append to `src/lib/ai/mode.test.ts` (the file already mocks `@vercel/edge-config` via `getMock`):

```ts
import { resolveAiModel, DEFAULT_AI_MODEL } from "./mode";

describe("resolveAiModel", () => {
  const orig = process.env.AI_MODEL;
  afterEach(() => {
    if (orig === undefined) delete process.env.AI_MODEL;
    else process.env.AI_MODEL = orig;
    getMock.mockReset();
  });

  it("uses a valid Edge Config slug", async () => {
    getMock.mockResolvedValue("anthropic/claude-haiku-4.5");
    expect(await resolveAiModel()).toBe("anthropic/claude-haiku-4.5");
  });
  it("falls back to env AI_MODEL when Edge Config throws", async () => {
    getMock.mockRejectedValue(new Error("unavailable"));
    process.env.AI_MODEL = "anthropic/claude-haiku-4.5";
    expect(await resolveAiModel()).toBe("anthropic/claude-haiku-4.5");
  });
  it("defaults to gpt-4o-mini when nothing is set", async () => {
    getMock.mockRejectedValue(new Error("unavailable"));
    delete process.env.AI_MODEL;
    expect(await resolveAiModel()).toBe(DEFAULT_AI_MODEL);
    expect(DEFAULT_AI_MODEL).toBe("openai/gpt-4o-mini");
  });
  it("ignores a non-slug Edge Config value (no '/')", async () => {
    getMock.mockResolvedValue("gpt-4o-mini"); // missing provider prefix
    delete process.env.AI_MODEL;
    expect(await resolveAiModel()).toBe(DEFAULT_AI_MODEL);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/ai/mode.test.ts`
Expected: FAIL — `resolveAiModel`/`DEFAULT_AI_MODEL` are not exported (import error / not a function).

- [ ] **Step 3: Implement** — add to `src/lib/ai/mode.ts` (below `resolveAiMode`):

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/ai/mode.test.ts`
Expected: PASS (all `resolveAiMode` + `resolveAiModel` tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/mode.ts src/lib/ai/mode.test.ts
git commit -m "feat(ai): resolveAiModel() — runtime gateway model knob

Edge Config aiModel -> env AI_MODEL -> default openai/gpt-4o-mini. A value must
be a provider/model slug to be accepted.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `GatewayTaskParser` request-scoped BYOK

**Files:**
- Modify: `src/lib/ai/gatewayParser.ts`
- Test: `src/lib/ai/gatewayParser.test.ts` (create)

**Interfaces:**
- Consumes: `generateText`, `Output` from `ai`.
- Produces: `new GatewayTaskParser(deps?: { today?: string; knownTags?: string[]; model?: string; byokKey?: string })`. When `byokKey` is set, `parse()` calls `generateText` with `providerOptions: { gateway: { byok: { anthropic: [{ apiKey: byokKey }] } } }`; when unset, no `providerOptions`.

- [ ] **Step 1: Write the failing test** — create `src/lib/ai/gatewayParser.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// gatewayParser imports "server-only" (line 1) — throws under the test runtime otherwise.
vi.mock("server-only", () => ({}));

// Mock only generateText; keep the real Output helper.
const { generateTextMock } = vi.hoisted(() => ({ generateTextMock: vi.fn() }));
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, generateText: generateTextMock };
});

import { GatewayTaskParser } from "./gatewayParser";

beforeEach(() => {
  generateTextMock.mockReset();
  generateTextMock.mockResolvedValue({ output: [] });
});

describe("GatewayTaskParser BYOK", () => {
  it("passes AI_API_KEY as gateway BYOK for anthropic when byokKey is set", async () => {
    await new GatewayTaskParser({ model: "anthropic/claude-haiku-4.5", byokKey: "sk-ant-test" }).parse("Gym");
    const args = generateTextMock.mock.calls[0][0];
    expect(args.providerOptions.gateway.byok.anthropic[0].apiKey).toBe("sk-ant-test");
  });

  it("sends no providerOptions when byokKey is absent", async () => {
    await new GatewayTaskParser({ model: "openai/gpt-4o-mini" }).parse("Gym");
    const args = generateTextMock.mock.calls[0][0];
    expect(args.providerOptions).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/ai/gatewayParser.test.ts`
Expected: FAIL — the first test throws reading `.gateway` of `undefined` (the parser doesn't send `providerOptions` yet). The second test passes trivially (documents the default).

- [ ] **Step 3: Implement** — edit `src/lib/ai/gatewayParser.ts`. Add the `byokKey` field/param and the conditional `providerOptions`:

Constructor — add the field and assignment:

```ts
  private byokKey?: string;
  constructor(deps: { today?: string; knownTags?: string[]; model?: string; byokKey?: string } = {}) {
    this.today = deps.today ?? todayISO();
    this.knownTags = deps.knownTags ?? [];
    this.model = deps.model ?? "openai/gpt-4o-mini";
    // Armed by AI_API_KEY presence (route passes it). The gateway applies it only to
    // anthropic/* routing, so anthropic runs on the user's own credits (no 403 / rate limit).
    this.byokKey = deps.byokKey;
  }
```

`parse()` — spread `providerOptions` only when a key is present:

```ts
  async parse(text: string): Promise<ParsedTask[]> {
    if (!text.trim()) return [];
    const { output } = await generateText({
      model: this.model,
      system: buildSystemPrompt({ today: this.today, knownTags: this.knownTags }),
      prompt: text,
      output: Output.array({ element: modelTaskSchema }),
      ...(this.byokKey
        ? { providerOptions: { gateway: { byok: { anthropic: [{ apiKey: this.byokKey }] } } } }
        : {}),
    });
    return output as ParsedTask[];
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/ai/gatewayParser.test.ts`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/gatewayParser.ts src/lib/ai/gatewayParser.test.ts
git commit -m "feat(ai): GatewayTaskParser request-scoped BYOK

Optional byokKey -> providerOptions.gateway.byok.anthropic. Armed by the caller;
the gateway applies it only to anthropic/* routing, so anthropic runs on the
user's own Anthropic credits (bypasses the free-tier 403 + rate limits).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Wire model + BYOK into the route

**Files:**
- Modify: `src/app/api/organize/route.ts`
- Test: `src/app/api/organize/route.model.test.ts` (create); `src/app/api/organize/route.fallback.test.ts` (modify — its `@/lib/ai/mode` mock must also provide `resolveAiModel`, since the real branch now calls it).

**Interfaces:**
- Consumes: `resolveAiMode`, `resolveAiModel` (Task 1); `GatewayTaskParser` with `{ model, byokKey }` (Task 2).
- Produces: no new exports — behaviour: in real mode, constructs `new GatewayTaskParser({ model: await resolveAiModel(), byokKey: process.env.AI_API_KEY })`.

- [ ] **Step 1: Write the failing test** — create `src/app/api/organize/route.model.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/mode", () => ({
  resolveAiMode: () => Promise.resolve("real"),
  resolveAiModel: () => Promise.resolve("anthropic/claude-haiku-4.5"),
}));

// Capture how the route constructs the gateway parser; return a successful parse.
const { ctorArgs } = vi.hoisted(() => ({ ctorArgs: { value: null as unknown } }));
vi.mock("@/lib/ai/gatewayParser", () => ({
  GatewayTaskParser: class {
    constructor(deps: unknown) {
      ctorArgs.value = deps;
    }
    parse() {
      return Promise.resolve([{ title: "Gym" }]);
    }
  },
}));

vi.spyOn(console, "log").mockImplementation(() => {});

import { POST } from "./route";

beforeEach(() => {
  ctorArgs.value = null;
  process.env.AI_API_KEY = "sk-ant-test";
});

describe("POST /api/organize — real-mode model + BYOK wiring", () => {
  it("constructs the gateway parser with the resolved model and AI_API_KEY as byokKey", async () => {
    const res = await POST(
      new Request("http://test/api/organize", { method: "POST", body: JSON.stringify({ text: "Gym" }) }),
    );
    expect(res.status).toBe(200);
    expect(ctorArgs.value).toEqual({ model: "anthropic/claude-haiku-4.5", byokKey: "sk-ant-test" });
    const json = await res.json();
    expect(json.degraded).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/api/organize/route.model.test.ts`
Expected: FAIL — the route currently calls `new GatewayTaskParser()` with no args, so `ctorArgs.value` is `{}` (or `undefined`), not the expected `{ model, byokKey }`.

- [ ] **Step 3: Implement** — two edits.

**(a)** `src/app/api/organize/route.ts` — import `resolveAiModel` and use it in the real branch:

Change the import line:

```ts
import { resolveAiMode, resolveAiModel } from "@/lib/ai/mode";
```

Change the real branch (inside the `if (mode === "real")`):

```ts
    if (mode === "real") {
      const model = await resolveAiModel();
      console.log(`[/api/organize] aiModel=${model}`);
      try {
        parsed = await new GatewayTaskParser({ model, byokKey: process.env.AI_API_KEY }).parse(text);
      } catch (err) {
        // Real AI unavailable (gateway/model/billing/timeout). Stay demo-safe:
        // fall back to the deterministic parser so the user still gets a plan,
        // and flag it so the UI can be honest instead of failing outright.
        console.error("[/api/organize] real parser unavailable — falling back to fake:", err);
        parsed = await new FakeTaskParser().parse(text);
        degraded = true;
      }
    } else {
```

**(b)** `src/app/api/organize/route.fallback.test.ts` — add `resolveAiModel` to the mode mock so the real branch doesn't crash on an undefined resolver:

```ts
vi.mock("@/lib/ai/mode", () => ({
  resolveAiMode: () => Promise.resolve("real"),
  resolveAiModel: () => Promise.resolve("openai/gpt-4o-mini"),
}));
```

- [ ] **Step 4: Run the route tests to verify they pass**

Run: `npx vitest run src/app/api/organize`
Expected: PASS — `route.model.test.ts` (new), plus the existing `route.test.ts`, `route.error.test.ts`, `route.fallback.test.ts` all green.

- [ ] **Step 5: Run the full sweep**

Run: `npm run lint && npm run typecheck && npm test`
Expected: lint clean, typecheck clean, all unit tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/organize/route.ts src/app/api/organize/route.model.test.ts src/app/api/organize/route.fallback.test.ts
git commit -m "feat(ai): route resolves aiModel + passes AI_API_KEY as BYOK

Real mode now constructs GatewayTaskParser({ model: resolveAiModel(), byokKey:
process.env.AI_API_KEY }). Fallback/degraded behaviour unchanged.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Eval both models + docs; verify the premise

**Files:**
- Modify: `scripts/eval-parser.ts`
- Modify: `docs/PROGRESS.md`
- Modify: `docs/superpowers/plans/2026-07-20-core-flow.md`

**Interfaces:**
- Consumes: `GatewayTaskParser` with `{ model, byokKey }` (Task 2).

- [ ] **Step 1: Update the eval** — edit `scripts/eval-parser.ts`. Read `EVAL_MODEL` (undefined → parser default) and pass `byokKey`:

Replace the parser construction line:

```ts
  const model = process.env.EVAL_MODEL; // e.g. anthropic/claude-haiku-4.5 (BYOK) — undefined uses the default
  const parser = new GatewayTaskParser({ today: TODAY, model, byokKey: process.env.AI_API_KEY });
  console.log(`Evaluating model: ${model ?? "(default) openai/gpt-4o-mini"}\n`);
```

- [ ] **Step 2: Update the docs.**

In `docs/PROGRESS.md`, under the AI-integration decision, add:

```markdown
  - **Runtime provider/model switch (issue #4):** new Edge Config `aiModel`
    (`Edge Config → env AI_MODEL → default openai/gpt-4o-mini`) picks the real-mode
    gateway slug. `anthropic/*` slugs route on the user's **own Anthropic account**
    via request-scoped BYOK (`AI_API_KEY` → `providerOptions.gateway.byok`), bypassing
    the free-tier 403 + rate limits. Prod: set `aiModel = anthropic/claude-haiku-4.5`.
```

In `docs/superpowers/plans/2026-07-20-core-flow.md`, update the "AI model" global-constraint line to note the runtime `aiModel` knob + BYOK for anthropic (one sentence, pointing at issue #4 and this plan).

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean (the eval script is TS-checked via the project `tsconfig`).

- [ ] **Step 4: Verify the premise against the real gateway** (needs a fresh OIDC token — `vercel env pull .env.local --yes` if expired — and `AI_API_KEY` in `.env.local`).

Run the managed model:
`EVAL_MODEL=openai/gpt-4o-mini npm run eval:ai`
Expected: `5/5 golden cases passed.`

Run the BYOK Anthropic model:
`EVAL_MODEL=anthropic/claude-haiku-4.5 npm run eval:ai`
Expected: `5/5 golden cases passed.` — **decisive: proves BYOK lifts the 403** (no `RestrictedModelsError`) and that `modelTaskSchema` is accepted by Anthropic tool-calling. If it 403s, BYOK is not taking effect — recheck `AI_API_KEY` and the `providerOptions.gateway.byok` shape before proceeding.

- [ ] **Step 5: Full sweep**

Run: `npm run lint && npm run typecheck && npm test && npm run test:e2e`
Expected: all green (e2e self-hosts fake mode on `:3100`).

- [ ] **Step 6: Commit**

```bash
git add scripts/eval-parser.ts docs/PROGRESS.md docs/superpowers/plans/2026-07-20-core-flow.md
git commit -m "chore(ai): eval both models via EVAL_MODEL + BYOK; document aiModel knob

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## After implementation (manual, by the user — not code)

- **Switch prod to Anthropic:** set Edge Config `aiModel = anthropic/claude-haiku-4.5`. `AI_API_KEY` is already set on Vercel (Production + Preview). Instant no-redeploy fallback: set `aiModel = openai/gpt-4o-mini`, or `aiMode = fake`.
- **Local real-mode test:** `AI_MODEL=anthropic/claude-haiku-4.5` in `.env.local` (or rely on Edge Config) with `AI_API_KEY` present.

## Self-review (completed while writing)

- **Spec coverage:** §3 config → Task 1; §4 parser/route → Tasks 2–3; §4 eval → Task 4; §7 setup → "After implementation"; §8 tests → Tasks 1–3 unit + Task 4 eval; §10 premise verification → Task 4 Step 4. Schema (§6) intentionally untouched (constraint). ✓
- **Placeholder scan:** none — every code/step is concrete. ✓
- **Type consistency:** `resolveAiModel(): Promise<string>` / `DEFAULT_AI_MODEL` (Task 1) used verbatim in Task 3; `GatewayTaskParser({ model, byokKey })` (Task 2) matches the route call (Task 3) and the eval (Task 4); `providerOptions.gateway.byok.anthropic[0].apiKey` identical in parser impl (Task 2) and its test. ✓
