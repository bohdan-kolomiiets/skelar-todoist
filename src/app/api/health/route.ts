import { NextResponse } from "next/server";

/**
 * Health check — a stable server endpoint for deploy smoke tests and e2e.
 *
 * This `api/` directory is the server-side boundary: secrets (e.g. the AI
 * provider key) and any backend calls live in Route Handlers like this one,
 * never in client code. See README "Architecture".
 */
export function GET() {
  return NextResponse.json({ status: "ok" });
}
