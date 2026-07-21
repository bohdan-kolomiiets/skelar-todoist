import { test, expect } from "@playwright/test";

test("landing redirects a first-time visitor to Welcome, then Get started reaches Capture", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/welcome/);
  await page.getByRole("button", { name: /get started/i }).click();
  await expect(page).toHaveURL(/\/capture/);
  await expect(page.getByRole("button", { name: /plan it/i })).toBeVisible();
});

test("health endpoint responds ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  expect(await res.json()).toEqual({ status: "ok" });
});
