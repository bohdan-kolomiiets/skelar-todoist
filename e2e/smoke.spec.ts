import { test, expect } from "@playwright/test";

test("home page renders the product name", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /ai day planner/i }),
  ).toBeVisible();
});

test("health endpoint responds ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  expect(await res.json()).toEqual({ status: "ok" });
});
