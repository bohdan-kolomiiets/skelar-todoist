import { test, expect } from "@playwright/test";

test("guest lands on Welcome, saves a plan, is nudged, signs in, and keeps the plan", async ({ page }) => {
  await page.goto("/");
  // Pre-guest → Welcome.
  await expect(page.getByRole("button", { name: /get started/i })).toBeVisible();
  await page.getByRole("button", { name: /get started/i }).click();

  // Capture → brain dump → Plan it (fake mode is deterministic).
  await page.getByRole("button", { name: /try an example/i }).click();
  await page.getByRole("button", { name: /plan it/i }).click();

  // Review → commit.
  await page.getByRole("button", { name: /add \d+ tasks?/i }).click();

  // Guest→free nudge appears; sign in to save.
  await expect(page.getByText(/keep this plan/i)).toBeVisible();
  await page.getByLabel(/email or name/i).fill("sam@example.com");
  await page.getByRole("button", { name: /save my plan/i }).click();

  // Tasks persisted under the signed-in profile (still on Today with tasks).
  await expect(page).toHaveURL(/\/today/);
  await expect(page.getByText(/pitch deck/i)).toBeVisible();
});
