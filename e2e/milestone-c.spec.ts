import { test, expect } from "@playwright/test";

// Milestone C flows. Runs in fake AI mode with FREE_DAILY_INPUTS=1 (playwright.config),
// so each test does exactly one parse and uses its own isolated browser context.

test("quick-add a single task via AI from Today", async ({ page }) => {
  // Pre-guest visiting /today is redirected to /welcome (T2) — go through Get started first.
  await page.goto("/");
  await page.getByRole("button", { name: /get started/i }).click();
  await page.goto("/today");

  await page.getByRole("button", { name: /add task/i }).click();
  await expect(page.getByRole("dialog", { name: /add a task/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /parse with ai/i })).toBeVisible();

  await page.getByLabel(/new task/i).fill("book dentist tomorrow");
  await page.getByRole("button", { name: /parse with ai/i }).click();

  // Single task → editor stage opens (dialog aria-label "New task"), prefilled title.
  await expect(page.getByRole("dialog", { name: /^new task$/i })).toBeVisible();
  await expect(page.getByLabel("Title")).toHaveValue(/book dentist/i);
  await page.getByRole("button", { name: /^done$/i }).click();
});

test("an unresolved-timing dump lands in Needs a date", async ({ page }) => {
  // Get started lands on /capture.
  await page.goto("/");
  await page.getByRole("button", { name: /get started/i }).click();
  await expect(page).toHaveURL(/\/capture/);

  await page.getByLabel(/brain dump/i).fill("call the vet at some point");
  await page.getByRole("button", { name: /plan it/i }).click();
  await page.getByRole("button", { name: /add \d+ tasks?/i }).click();

  await page.goto("/inbox");
  await expect(page.getByText(/needs a date/i)).toBeVisible();
});
