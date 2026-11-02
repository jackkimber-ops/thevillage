import { expect, test } from "@playwright/test";

// These run against the demo data (DEMO_DATA=1), a repeating week of classes and open play.

test("home shows upcoming sessions and where to find us", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "coming up" })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Book:/ }).first()).toBeVisible();
  await expect(page.locator(".session-card")).toHaveCount(6);
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

test("team feedback 2 Nov: the filter and the day you're on stay when you change view", async ({ page }) => {
  await page.goto("/classes");
  const pills = page.locator(".pills");
  await pills.getByRole("link", { name: "Open play", exact: true }).click();
  await expect(pills.getByRole("link", { name: "Open play", exact: true })).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Week", exact: true }).click();
  await expect(page.locator(".week-grid")).toBeVisible();
  await expect(pills.getByRole("link", { name: "Open play", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".week-block.kind-class")).toHaveCount(0);
  await page.getByRole("link", { name: "Month", exact: true }).click();
  await expect(page.locator(".month-grid")).toBeVisible();
  await expect(pills.getByRole("link", { name: "Open play", exact: true })).toHaveAttribute("aria-current", "page");
  // Pick a day next week in Month, then List shows that week, still Open play only.
  await pills.getByRole("link", { name: "All", exact: true }).click();
  await expect(pills.getByRole("link", { name: "All", exact: true })).toHaveAttribute("aria-current", "page");
  const nextWeek = new Date(Date.now() + 7 * 3600000 + 8 * 86400000).toISOString().slice(0, 10);
  await page.goto(`/classes?view=month&day=${nextWeek}&filter=open-play`);
  await page.getByRole("link", { name: "List", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`date=${nextWeek}`));
  await expect(page).toHaveURL(/filter=open-play/);
  await expect(page.locator(".session-card").first()).toBeVisible();
  await expect(page.locator(".session-card", { hasText: "Open Play" }).first()).toBeVisible();
});

test("team feedback 2 Nov: the guest form keeps what you typed through the menu and the privacy policy; children can be removed", async ({ page }) => {
  await page.goto("/classes?filter=classes");
  await page.locator(".session-card", { hasNot: page.locator(".full-label") }).first().getByRole("link").click();
  await page.getByRole("link", { name: "Book this class" }).click();
  await page.getByRole("link", { name: "Book as a guest" }).click();
  await expect(page).toHaveURL(/\/guest$/);
  const guestUrl = page.url();
  await page.getByLabel("Your name").fill("Lan Nguyen");
  await page.getByLabel("Mobile number").fill("0901234567");
  await page.getByRole("button", { name: "Zalo" }).click();
  await page.getByText(/Add your child/).click();
  await page.getByText(/Add another child/).click();
  await page.getByLabel("Child's name").first().fill("Bao");
  await page.getByLabel("Child's name").nth(1).fill("Mai");
  // Remove child 1: child 2 (Mai) stays and becomes child 1.
  await page.getByRole("button", { name: "Remove child 1" }).click();
  await expect(page.getByLabel("Child's name")).toHaveCount(1);
  await expect(page.getByLabel("Child's name")).toHaveValue("Mai");

  // Menu and back.
  await page.getByRole("link", { name: "Menu" }).click();
  await expect(page.getByRole("heading", { name: "menu" })).toBeVisible();
  await page.getByRole("link", { name: "Close" }).click();
  await expect(page).toHaveURL(guestUrl);
  await expect(page.getByLabel("Your name")).toHaveValue("Lan Nguyen");
  await expect(page.getByLabel("Mobile number")).toHaveValue("0901234567");
  await expect(page.getByRole("button", { name: "Zalo" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Child's name")).toHaveValue("Mai");

  // Privacy policy and Back.
  await page.getByRole("link", { name: "privacy policy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await page.getByRole("link", { name: "Back" }).click();
  await expect(page).toHaveURL(guestUrl);
  await expect(page.getByLabel("Your name")).toHaveValue("Lan Nguyen");
  await expect(page.getByLabel("Child's name")).toHaveValue("Mai");
});

test("team feedback 2 Nov: Questions about this class, then closing the menu, returns to the class", async ({ page }) => {
  await page.goto("/classes?filter=classes");
  await page.locator(".session-card", { hasNot: page.locator(".full-label") }).first().getByRole("link").click();
  await expect(page).toHaveURL(/\/classes\/[^/?]+\?/);
  const classUrl = page.url();
  await page.getByRole("link", { name: /Questions about this class/ }).click();
  await expect(page.getByRole("heading", { name: "menu" })).toBeVisible();
  await page.getByRole("link", { name: "Close" }).click();
  await expect(page).toHaveURL(classUrl);
});

test("team feedback 2 Nov: Vietnamese opening hours", async ({ page }) => {
  await page.goto("/menu?lang=vi");
  await expect(page.getByText("Mở cửa mỗi ngày 8:30–17:00")).toBeVisible();
  await expect(page.getByText("Every day 8:30–17:00")).toHaveCount(0);
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

test("hire the studio writes the WhatsApp message (from an hour to a full day, up to 15 people)", async ({ page }) => {
  await page.goto("/hire");
  await expect(page.getByText(/full day/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Send on WhatsApp" })).toBeDisabled();
  const send = page.getByRole("link", { name: "Send on WhatsApp" });
  await page.getByLabel("Date").fill("2026-12-05");
  await page.getByLabel("Time and how long").fill("the full day");
  await expect(page.getByText("Up to 15 people")).toBeVisible();
  await page.getByLabel("Group size").fill("20");
  await expect(page.getByText(/We can host up to 15 people/)).toBeVisible();
  await page.getByLabel("Group size").fill("12");
  await expect(send).toHaveAttribute("href", /text=.*2026-12-05.*the%20full%20day.*12/);
  // Kept if they look at the menu and come back.
  await page.getByRole("link", { name: "Menu" }).click();
  await page.getByRole("link", { name: "Close" }).click();
  await expect(page.getByLabel("Time and how long")).toHaveValue("the full day");
});

test("Back from a class returns to the week you were looking at", async ({ page }) => {
  await page.goto("/classes");
  const thisWeek = await page.locator(".stepper strong").textContent();
  await page.getByRole("link", { name: "See next week" }).click();
  await expect(page.locator(".stepper strong")).not.toHaveText(thisWeek!); // wait for next week to load
  const week = await page.locator(".stepper strong").textContent();
  await page.locator(".session-card", { hasNot: page.locator(".full-label") }).first().getByRole("link").click();
  await page.getByRole("link", { name: "Back" }).click();
  await expect(page.locator(".stepper strong")).toHaveText(week!);
});

test("team feedback 30 Oct: ?lang=vi from the website opens the booking site in Vietnamese; menu links back to the website", async ({ page }) => {
  await page.goto("/classes?lang=vi");
  await expect(page).toHaveURL(/\/classes$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await page.goto("/menu?lang=en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("link", { name: "The Village website" })).toHaveAttribute("href", /thevillagesaigon\.com\/en$/);
  await expect(page.locator(".message-icon svg").first()).toBeVisible();
});

test("logging in to book shows which class you're booking", async ({ page }) => {
  await page.goto("/classes?filter=classes");
  await page.getByRole("link", { name: "See next week" }).click();
  await expect(page).toHaveURL(/date=/);
  const card = page.locator(".session-card", { hasNot: page.locator(".full-label") }).first();
  const title = (await card.locator(".session-title").textContent())!.trim();
  await card.getByRole("link").click();
  await page.getByRole("link", { name: "Book this class" }).click();
  await expect(page.getByRole("heading", { name: "log in" })).toBeVisible();
  await expect(page.locator(".summary")).toContainText("You're booking");
  await expect(page.locator(".summary")).toContainText(new RegExp(title, "i"));
});
