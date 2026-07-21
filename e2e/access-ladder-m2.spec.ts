import { test, expect } from "@playwright/test";

test("a non-Pro user hits the daily limit, upgrades, and gets unlimited AI", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /get started/i }).click(); // guest

  // First plan — allowed (limit is 1), lands on Review.
  await page.getByRole("button", { name: /try an example/i }).click();
  await page.getByRole("button", { name: /plan it/i }).click();
  await expect(page.getByRole("button", { name: /add \d+ tasks?/i })).toBeVisible();
  await page.getByRole("button", { name: /add \d+ tasks?/i }).click();

  // Back on Capture, dump again and try to plan — now blocked by the limit sheet.
  // The "Try an example" chip is first-run only (hidden once the profile has
  // organized once — see CaptureFlow's `firstRun`), so type the dump directly.
  await page.goto("/capture");
  await page.getByLabel(/brain dump/i).fill("Buy milk. Call the dentist.");
  await page.getByRole("button", { name: /plan it/i }).click();
  await expect(page.getByText(/out of ai plans for today/i)).toBeVisible();

  // Go to Plans and upgrade.
  await page.getByRole("link", { name: /see plans/i }).click();
  await expect(page).toHaveURL(/\/plans/);
  await page.getByRole("button", { name: /upgrade to pro/i }).click();

  // Back to Capture — Pro now plans without the limit sheet.
  await page.goto("/capture");
  await page.getByLabel(/brain dump/i).fill("Water the plants. Email the landlord.");
  await page.getByRole("button", { name: /plan it/i }).click();
  await expect(page.getByRole("button", { name: /add \d+ tasks?/i })).toBeVisible();
});
