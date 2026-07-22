import { z } from "zod";
import type { ParsedTask } from "@/lib/task/types";

/**
 * One parsed task = the parseable fields only (PRODUCT §3 output contract).
 * Lenient on purpose: the deterministic fake parser omits keys it doesn't set,
 * and real strict-mode models emit `null` — both must validate. Every optional
 * field is therefore `.nullish()` (accepts value | null | undefined).
 */
export const parsedTaskSchema = z.object({
  title: z.string(),
  notes: z.string().nullish(),
  doDate: z.string().nullish(), // "YYYY-MM-DD"
  time: z.string().nullish(), // "HH:mm"
  timeOfDay: z.enum(["morning", "afternoon", "evening"]).nullish(),
  deadline: z.string().nullish(), // "YYYY-MM-DD"
  priority: z.enum(["high", "medium", "low", "none"]).nullish(),
  tags: z.array(z.string()).nullish(),
});

export const parsedTasksSchema = z.array(parsedTaskSchema);

/**
 * The schema handed to the model for structured output. OpenAI strict structured
 * outputs require EVERY property to be listed in `required` and reject truly
 * optional keys — so instead of `.optional()`, absent values are represented as
 * required-but-`.nullable()`. (Anthropic tool-calling accepted the lenient schema;
 * gpt-4o-mini does not — see issue #4.) Output validates against the lenient
 * `parsedTaskSchema`, and `createTask` normalizes the nulls with `??` on commit.
 */
export const modelTaskSchema = z.object({
  title: z.string(),
  notes: z.string().nullable(),
  doDate: z.string().nullable(), // "YYYY-MM-DD"
  time: z.string().nullable(), // "HH:mm"
  timeOfDay: z.enum(["morning", "afternoon", "evening"]).nullable(),
  deadline: z.string().nullable(), // "YYYY-MM-DD"
  priority: z.enum(["high", "medium", "low", "none"]).nullable(),
  tags: z.array(z.string()).nullable(),
});

/**
 * Compile-time guard: every key `modelTaskSchema` produces must exist on
 * `ParsedTask`. `needsDate` is excluded — it's added to the model schema in a
 * later task (C-T9). If a field on `modelTaskSchema` is renamed or removed,
 * `AssertExtends`'s constraint fails and this file stops typechecking.
 *
 * (`satisfies` can't be used here directly — it only applies to value
 * expressions, not `type` declarations — so the same "T assignable to U"
 * check is expressed via a constrained generic instead.)
 */
type AssertExtends<T extends U, U> = T;
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- type-only compile-time guard; never referenced at runtime
type _ModelSchemaMatchesParsedTask = AssertExtends<
  z.infer<typeof modelTaskSchema>,
  Record<keyof Omit<ParsedTask, "needsDate">, unknown>
>;
