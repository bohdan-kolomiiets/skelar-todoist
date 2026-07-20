import { z } from "zod";

/** One parsed task = the parseable fields only (PRODUCT §3 output contract). */
export const parsedTaskSchema = z.object({
  title: z.string(),
  notes: z.string().nullish(),
  doDate: z.string().nullish(), // "YYYY-MM-DD"
  time: z.string().nullish(), // "HH:mm"
  timeOfDay: z.enum(["morning", "afternoon", "evening"]).nullish(),
  deadline: z.string().nullish(), // "YYYY-MM-DD"
  priority: z.enum(["high", "medium", "low", "none"]).optional(),
  tags: z.array(z.string()).optional(),
});

export const parsedTasksSchema = z.array(parsedTaskSchema);
