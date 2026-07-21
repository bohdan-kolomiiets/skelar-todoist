# Design — Runtime AI provider/model switch (BYOK Anthropic)

> **Status: approved (brainstorm, 2026-07-21).** Next: turn into a TDD implementation plan
> (writing-plans skill). Builds directly on the P1 fix (issue #4) already in the working tree
> — the fake-fallback, honest `degraded` UX, and strict `modelTaskSchema` all stay.

## 1. Goal

Let the parser run on **the user's own paid Anthropic account via the Vercel AI Gateway
(BYOK)**, and make the choice of backend a **runtime switch** (Edge Config, no redeploy)
between:

- `fake` — deterministic `FakeTaskParser` (local dev, tests, instant demo fallback)
- **Vercel-managed** `openai/gpt-4o-mini` — the free-$5-credits model (current default)
- **BYOK** `anthropic/claude-haiku-4.5` — the user's paid Anthropic credits

### Why

`openai/gpt-4o-mini` (the P1 model) works but on the Gateway **free tier** it is
**rate-limited** under bursts and its output quality is variable. The user has **paid Anthropic
credits**. Anthropic premium models are gated on Vercel's free managed credits
(`403 RestrictedModelsError`), but **BYOK routes the call on the user's own Anthropic account**,
bypassing both the 403 gate and the Vercel free-tier rate limit, while keeping the request
**through the gateway** (observability, failover, zero markup).

## 2. Decisions (locked in the brainstorm)

- **Switch shape: two Edge Config knobs** (Option A), not one overloaded variable:
  - `aiMode`: `fake` | `real` — **unchanged**; the instant kill switch.
  - `aiModel`: the gateway model slug used in `real` mode.
- **BYOK is "armed" by `AI_API_KEY` presence; the gateway decides when it fires.** The key is
  passed as `byok.anthropic` on every real-mode call when the env var is set; the gateway
  applies it **only to `anthropic/*` routing**. So the model slug alone selects the backend:

  | `aiModel` | Credential the gateway uses | Result |
  |---|---|---|
  | `openai/gpt-4o-mini` | key ignored → Vercel managed | free $5 credits |
  | `anthropic/claude-haiku-4.5` | `AI_API_KEY` → user's Anthropic account | no 403, no Vercel free-tier rate limit |

  This is the answer to "when do we pass the key?": **always, when it exists** — no third knob,
  no code that branches on provider. Documented **convention: `anthropic/*` → BYOK.** (Managed
  Anthropic on paid Vercel credits is a one-line addition later — YAGNI now.)
- **Anthropic model = `anthropic/claude-haiku-4.5`** — cheap (~0.2¢/parse), strong at structured
  field extraction, and Anthropic tool-calling avoids gpt-4o-mini's strict-schema quirk.
- **One output schema for both providers** — keep `modelTaskSchema` (required-but-nullable). It
  is valid for OpenAI strict outputs *and* Anthropic tool-calling. The eval verifies both.
- **`gpt-4o-mini` is retained**, not replaced — it stays the code-level default and a
  free-credits option you can switch back to at runtime.

## 3. Configuration model

Two independent resolvers in `src/lib/ai/mode.ts`, each `Edge Config → env → default`:

| Knob | Edge Config key | Env fallback | Default (code) | Meaning |
|---|---|---|---|---|
| Mode | `aiMode` | `AI_MODE` | `fake` | is real AI on? (existing) |
| Model | `aiModel` | `AI_MODEL` | `openai/gpt-4o-mini` | which gateway slug in real mode (new) |

- The **code default is `openai/gpt-4o-mini`** deliberately: it needs no BYOK key, so a
  misconfigured environment degrades to the safe managed model, never a hard 403.
- **Deployed preference is expressed by config, not code** (same layering as `aiMode`: code
  default `fake`, prod sets `real`). Prod will set Edge Config `aiModel = anthropic/claude-haiku-4.5`.
- `resolveAiModel()` returns a `string` (a `provider/model` slug); a light guard (must contain
  `/`) rejects malformed Edge Config/env values and falls through to the next source.

## 4. Component changes

| File | Change |
|---|---|
| `src/lib/ai/mode.ts` | Add `resolveAiModel(): Promise<string>`, mirroring `resolveAiMode` (Edge Config `aiModel` → env `AI_MODEL` → `"openai/gpt-4o-mini"`). |
| `src/lib/ai/gatewayParser.ts` | Constructor gains optional `byokKey?: string`. When set, `parse()` passes `providerOptions: { gateway: { byok: { anthropic: [{ apiKey: byokKey }] } } }` to `generateText`. Model default unchanged. |
| `src/app/api/organize/route.ts` | In the real branch: `const model = await resolveAiModel();` then `new GatewayTaskParser({ model, byokKey: process.env.AI_API_KEY })`. Fallback → fake + `degraded` logic **unchanged**. |
| `scripts/eval-parser.ts` | Pass `byokKey: process.env.AI_API_KEY`; allow `EVAL_MODEL` to pick the slug so the golden set can be run against each backend. |
| `docs/PROGRESS.md`, core-flow plan | Record the new `aiModel` knob + BYOK convention. |

The `byok` option shape is typed by `@ai-sdk/gateway@4.0.24`
(`GatewayProviderOptions.byok?: Record<string, Array<Record<string, unknown>>>`, already a
transitive dep). Constructed inline; no new direct dependency required.

## 5. Data flow (real mode)

```
Plan it → POST /api/organize
  → resolveAiMode() = "real"
  → resolveAiModel() = "anthropic/claude-haiku-4.5"   (from Edge Config)
  → new GatewayTaskParser({ model, byokKey: process.env.AI_API_KEY }).parse(text)
      → generateText({ model, output: Output.array(modelTaskSchema),
                       providerOptions.gateway.byok.anthropic = [{ apiKey }] })
      → gateway routes anthropic/* on the BYOK credential (user's Anthropic account)
  → parsedTasksSchema.parse(...) → { tasks, degraded: false }
```

If the gateway/model call throws (bad key, provider down, etc.) the **existing** handler falls
back to `FakeTaskParser` and returns `{ tasks, degraded: true }` → the Review screen shows the
honest "AI temporarily unavailable" notice. No new error paths.

## 6. Schema & prompt

Unchanged. `modelTaskSchema` (all keys required, values nullable) is the model-output contract
for both providers; `parsedTaskSchema` remains the lenient validation contract; `createTask`
normalizes nulls with `??`. The system prompt already says "omit **or null** when unknown", so
it needs no change for either provider.

## 7. Setup (manual, done by the user)

- **Prod:** set Edge Config `aiModel = anthropic/claude-haiku-4.5`. `AI_API_KEY` (the Anthropic
  key) is already set on Vercel (Production + Preview). Flip `aiModel` back to
  `openai/gpt-4o-mini`, or `aiMode` to `fake`, for an instant no-redeploy fallback.
- **Local:** `AI_API_KEY` is already in `.env.local`; set `AI_MODEL=anthropic/claude-haiku-4.5`
  (or rely on Edge Config) to exercise BYOK. `VERCEL_OIDC_TOKEN` still authenticates the gateway
  itself; re-`vercel env pull` when it expires (~24h).

## 8. Testing

- **Unit — `resolveAiModel`:** resolution order (Edge Config wins → env → default) and the
  malformed-value guard. Mock `@vercel/edge-config`'s `get`.
- **Unit — `GatewayTaskParser` BYOK wiring:** mock `generateText` from `ai`; assert
  `providerOptions.gateway.byok.anthropic[0].apiKey === byokKey` when a key is passed, and that
  `providerOptions` is absent when it isn't. (Tests wiring, not the network.)
- **Route:** existing tests keep passing; where the real branch is exercised, `resolveAiModel`
  is mocked alongside `resolveAiMode`.
- **Eval (`npm run eval:ai`, opt-in, real network):** `EVAL_MODEL` selects the slug for a run
  (one run per model); run it once for `openai/gpt-4o-mini` and once for
  `anthropic/claude-haiku-4.5` to confirm (a) BYOK lifts the 403 for Anthropic and (b)
  `modelTaskSchema` is accepted by Anthropic tool-calling. This is the decisive verification of
  the whole premise.
- Full sweep (`lint && typecheck && test && test:e2e`) stays green; e2e remains `fake` mode.

## 9. Out of scope (YAGNI)

- Managed-Anthropic-on-paid-Vercel-credits path (the "don't use BYOK for anthropic" case).
- A direct `@ai-sdk/anthropic` provider (gateway BYOK covers the need without a new dep).
- Gateway failover `order`/`models`, cost `tags`, per-user rate limiting.
- Prompt/model quality tuning and the deferred `needsDate`/tz robustness items (Milestone C).
- Changing the P1 fallback/`degraded` UX (already shipped).

## 10. Verify at implementation time

- **The premise:** free-tier account + BYOK actually returns 200 for `anthropic/claude-haiku-4.5`
  (not still 403). Proven by the eval once BYOK is wired — do this first.
- Exact `providerOptions.gateway.byok` shape against the installed `@ai-sdk/gateway@4.0.24`
  types before relying on it.
- `modelTaskSchema` passes Anthropic tool-calling with no adaptation surprises (eval).
