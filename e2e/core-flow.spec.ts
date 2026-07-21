import { test, expect } from "@playwright/test";

test("brain dump → AI structures tasks → Today plan (fake mode)", async ({ page }) => {
  await page.goto("/capture");

  // Fill the canonical example dump and plan it.
  await page.getByRole("button", { name: /try an example/i }).click();
  await page.getByRole("button", { name: /plan it/i }).click();

  // Review shows the four structured tasks.
  const commit = page.getByRole("button", { name: /add 4 tasks/i });
  await expect(commit).toBeVisible();
  await expect(page.getByText("Finish the pitch deck")).toBeVisible();

  // Commit → land on Today with the parsed tasks.
  await commit.click();
  await expect(page).toHaveURL(/\/today/);
  await expect(page.getByText("Gym")).toBeVisible();
  await expect(page.getByText("Reply to Anna")).toBeVisible();
  await expect(page.getByText(/0 of 3 done/i)).toBeVisible(); // deck, gym, reply on Today

  // The someday item routed to Inbox.
  await page.getByRole("link", { name: /inbox/i }).click();
  await expect(page.getByText(/read that design book/i)).toBeVisible();
});

test("a completed task moves under the Completed toggle", async ({ page }) => {
  await page.goto("/capture");
  await page.getByRole("button", { name: /try an example/i }).click();
  await page.getByRole("button", { name: /plan it/i }).click();
  await page.getByRole("button", { name: /add 4 tasks/i }).click();

  await page.getByRole("button", { name: /^complete$/i }).first().click();
  await expect(page.getByText(/1 of 3 done/i)).toBeVisible();
});
