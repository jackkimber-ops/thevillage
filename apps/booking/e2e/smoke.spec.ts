import { expect, test } from "@playwright/test";

test("home page shows the welcome heading in English", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "welcome to the village" })).toBeVisible();
});

test("language button switches to Vietnamese and back", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Tap for Tiếng Việt/ }).click();
  await expect(page.getByRole("button", { name: /Chạm để chọn English/ })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await page.getByRole("button", { name: /Chạm để chọn English/ }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("staff app is served under /staff on previews", async ({ page }) => {
  await page.goto("/staff");
  await expect(page.getByRole("heading", { name: "staff" })).toBeVisible();
});

test("health check responds", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  expect((await res.json()).status).toBe("ok");
});
