import { test, expect } from "@playwright/test";

test("guest joins the voice waitlist and sees the joined state on reopen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /get started/i }).click(); // guest → /capture

  // Open the voice teaser and join with an email.
  await page.getByRole("button", { name: /voice input, coming soon/i }).click();
  await expect(page.getByText(/talk instead of type/i)).toBeVisible();
  await page.getByLabel(/email/i).fill("guest@example.com");
  await page.getByRole("button", { name: /notify me/i }).click();
  // The component renders a curly apostrophe (You&rsquo;re). Match the apostrophe
  // with `.` so the assertion is robust to the glyph (straight vs. curly).
  await expect(page.getByText(/you.re on the list/i)).toBeVisible();

  // Close and reopen — the joined state persists.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /voice input, coming soon/i }).click();
  await expect(page.getByText(/you.re on the list/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /notify me/i })).toHaveCount(0);
});
