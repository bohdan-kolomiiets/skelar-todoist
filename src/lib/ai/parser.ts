import type { ParsedTask } from "../task/types";

/** The mocked boundary (PRODUCT §3, §17). Fake and real parsers implement this. */
export interface TaskParser {
  parse(text: string): Promise<ParsedTask[]>;
}
