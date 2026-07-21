import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config.
 *
 * - Locally: boots the dev server and tests against it.
 * - In CI: set BASE_URL (e.g. a Vercel preview URL) and the local server is
 *   skipped, so the real deployed app is exercised.
 *
 * Mobile-first product → the default project emulates a phone.
 */
// The e2e web server runs on a dedicated port so it never collides with — and gets
// reused instead of — a `npm run dev` server on :3000, which may be in real AI mode
// (Edge Config aiMode=real) and would make the "fake mode" e2e non-deterministic.
const E2E_PORT = 3100;
const baseURL = process.env.BASE_URL ?? `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "html" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `npm run dev -- -p ${E2E_PORT}`,
        url: `http://localhost:${E2E_PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        // Force hermetic fake mode: an empty EDGE_CONFIG makes resolveAiMode() skip the
        // real Edge Config and fall through to AI_MODE=fake.
        env: { ...process.env, EDGE_CONFIG: "", AI_MODE: "fake" },
      },
});
