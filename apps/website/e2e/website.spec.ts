import { expect, test } from "@playwright/test";

test("English home page: headline, Book buttons to the booking site, studio details", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("pilates and movement for mums and little ones");
  await expect(page.getByRole("link", { name: "Book now" }).first()).toHaveAttribute("href", "https://book.thevillagesaigon.com");
  await expect(page.getByRole("link", { name: "See the timetable" })).toHaveAttribute("href", "https://book.thevillagesaigon.com/classes");
  await expect(page.getByText("47/1 Quốc Hương, An Khánh, Hồ Chí Minh")).toBeVisible();
  await expect(page.getByRole("link", { name: "Find us on Google Maps" })).toHaveAttribute("href", /maps/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("Vietnamese at /vi, with a link back to English", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Tiếng Việt" }).click();
  await expect(page).toHaveURL(/\/vi$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.getByRole("link", { name: "Đặt chỗ" }).first()).toBeVisible();
  await page.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("search engines get a description, both languages and the business details", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Pilates/);
  await expect(page.locator('link[rel="alternate"][hreflang="vi"]')).toHaveAttribute("href", /\/vi$/);
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(ld.name).toBe("The Village - Family Club");
});
