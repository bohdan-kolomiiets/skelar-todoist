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
const baseURL = process.env.BASE_URL ?? "http://localhost:3000";

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
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
