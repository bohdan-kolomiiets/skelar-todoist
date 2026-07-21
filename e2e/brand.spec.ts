import { test, expect } from "@playwright/test";

test("brand assets are served with the right content types", async ({ request }) => {
  const og = await request.get("/opengraph-image");
  expect(og.ok()).toBeTruthy();
  expect(og.headers()["content-type"]).toContain("image/png");

  const apple = await request.get("/apple-icon");
  expect(apple.ok()).toBeTruthy();
  expect(apple.headers()["content-type"]).toContain("image/png");

  const icon = await request.get("/icon.svg");
  expect(icon.ok()).toBeTruthy();
  expect(icon.headers()["content-type"]).toContain("image/svg+xml");

  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  expect(await manifest.json()).toMatchObject({ name: "Dayspark" });
});

test("the page head wires up the Dayspark brand", async ({ page }) => {
  await page.goto("/capture");
  await expect(page.locator('head meta[property="og:image"]')).toHaveCount(1);
  await expect(page.locator('head meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  await expect(page.locator('head link[rel="icon"]')).toHaveCount(1);
  await expect(page.locator('head link[rel="manifest"]')).toHaveCount(1);
  // the in-app wordmark
  await expect(page.getByText("spark")).toBeVisible();
});
