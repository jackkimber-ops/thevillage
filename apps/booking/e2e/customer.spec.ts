import { expect, test } from "@playwright/test";

// These run against the demo data (DEMO_DATA=1), a repeating week of classes and open play.

test("home shows upcoming sessions and where to find us", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "coming up" })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Book:/ }).first()).toBeVisible();
  await expect(page.locator(".session-card")).toHaveCount(3);
  await expect(page.locator(".session-card .full-label")).toHaveCount(0); // only sessions people can still book
  await expect(page.getByRole("link", { name: "Open in Google Maps" })).toHaveAttribute("href", /maps/);
});

test("timetable list: sessions by day, filters, and Full instead of Book", async ({ page }) => {
  await page.goto("/classes");
  await expect(page.getByRole("heading", { name: "classes" })).toBeVisible();
  await expect(page.getByRole("link", { name: "List" })).toHaveAttribute("aria-current", "page");
  // Open play shows the price, never places left.
  const openPlay = page.locator(".session-card", { hasText: "Open Play" }).first();
  await expect(openPlay).toContainText("150,000 ₫ per child");
  await expect(openPlay).not.toContainText("places left");
  await page.getByRole("link", { name: "Open play", exact: true }).click();
  await expect(page.locator(".session-card", { hasText: "Pilates" })).toHaveCount(0);
  await page.getByRole("link", { name: "Classes", exact: true }).first().click();
  await expect(page.locator(".session-card", { hasText: "Open Play" })).toHaveCount(0);
});

test("timetable can't go back before this week or beyond the booking window", async ({ page }) => {
  await page.goto("/classes");
  await expect(page.getByRole("link", { name: "Previous week" })).toHaveCount(0);
  for (let i = 0; i < 6; i++) {
    const next = page.getByRole("link", { name: "Next week", exact: true });
    if ((await next.count()) === 0) break;
    const label = await page.locator(".stepper strong").textContent();
    await next.click();
    await expect(page.locator(".stepper strong")).not.toHaveText(label!);
  }
  await expect(page.getByRole("link", { name: "Next week", exact: true })).toHaveCount(0);
});

test("list shows one calendar week, with See next week at the bottom", async ({ page }) => {
  await page.goto("/classes");
  const thisWeek = await page.locator(".stepper strong").textContent();
  await page.getByRole("link", { name: "See next week" }).click();
  await expect(page.locator(".stepper strong")).not.toHaveText(thisWeek!);
  const date = new URL(page.url()).searchParams.get("date")!;
  expect(new Date(`${date}T00:00:00Z`).getUTCDay()).toBe(1); // a Monday
  await expect(page.locator(".day-label").first()).toHaveText(/^\w+ \d+ \w+$/);
  await expect(page.getByRole("link", { name: "Previous week" })).toHaveCount(1);
});

test("week and month views", async ({ page }) => {
  await page.goto("/classes?view=week");
  await expect(page.locator(".week-col")).toHaveCount(7);
  await expect(page.locator(".week-block").first()).toBeVisible();
  await page.getByRole("link", { name: "Month" }).click();
  await expect(page.locator(".month-cell").first()).toBeVisible();
  await expect(page.locator(".month-cell.later").first()).toBeVisible();
});

test("a filter picked in List doesn't hide Open Play in Week or Month", async ({ page }) => {
  await page.goto("/classes");
  const pills = page.locator(".pills");
  await pills.getByRole("link", { name: "Classes", exact: true }).click();
  await expect(pills.getByRole("link", { name: "Classes", exact: true })).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Month" }).click();
  await expect(page.locator(".legend")).toContainText("Open Play");
  await page.getByRole("link", { name: "Week" }).click();
  await expect(page.locator(".week-block.kind-open_play, .week-block.swatch-full", { hasText: "Open Play" }).first()).toBeVisible();
});

test("session details", async ({ page }) => {
  await page.goto("/classes?filter=classes");
  await page.locator(".session-card", { hasNot: page.locator(".full-label") }).first().getByRole("link").click(); // not Full or Closed
  await expect(page.getByRole("link", { name: "Book this class" })).toBeVisible();
  await expect(page.getByText("1 class credit, or 450,000 ₫ on the day")).toBeVisible();
  await expect(page.getByRole("link", { name: /Questions about this class/ })).toBeVisible();
});

test("menu has message us links from the studio settings", async ({ page }) => {
  await page.goto("/menu");
  await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", /wa\.me/);
  await expect(page.getByRole("link", { name: "Email" })).toHaveAttribute("href", /^mailto:/);
  await page.getByRole("button", { name: "Tiếng Việt" }).click();
  await expect(page.getByRole("heading", { name: "nhắn cho chúng tôi" })).toBeVisible();
});

test("hire the studio writes the WhatsApp message", async ({ page }) => {
  await page.goto("/hire");
  await expect(page.getByRole("button", { name: "Send on WhatsApp" })).toBeDisabled();
  const send = page.getByRole("link", { name: "Send on WhatsApp" });
  await page.getByLabel("Date").fill("2026-12-05");
  await page.getByLabel("Start time").fill("13:00");
  await page.getByRole("button", { name: "2 hours" }).click();
  await page.getByLabel("Group size").fill("12");
  await expect(send).toHaveAttribute("href", /text=.*2026-12-05.*13%3A00.*2%20hours.*12/);
});
