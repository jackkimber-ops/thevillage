import { expect, test, type Page } from "@playwright/test";

// Staff app against the demo store (DEMO_DATA=1): manager@village.test (Phuong) and instructor@village.test (Mai).

async function staffLogin(page: Page, email: string) {
  await page.goto("/staff/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send me a code" }).click();
  await page.getByLabel("your code").fill("123456");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("navigation", { name: "Staff menu" }).or(page.getByRole("navigation", { name: "Staff sections" })).first()).toBeAttached();
}

const uid = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

test("customers can't get into the staff app", async ({ page }) => {
  await page.goto("/staff/login");
  await page.getByLabel("Email").fill(`parent${uid()}@example.com`);
  await page.getByRole("button", { name: "Send me a code" }).click();
  await page.getByLabel("your code").fill("123456");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("This email isn't a staff account")).toBeVisible();
});

test("dashboard: a guest booking shows in the get-in-touch list until Contacted", async ({ page, browser }) => {
  // A guest books from the customer site.
  const guest = await (await browser.newContext()).newPage();
  const name = `Guest ${uid()}`;
  await guest.goto("/classes?filter=classes");
  // Wait for the week to really change, or this can pick a class today inside the 1-hour cut-off.
  const thisWeek = await guest.locator(".stepper strong").textContent();
  await guest.getByRole("link", { name: "Next week", exact: true }).click();
  await expect(guest.locator(".stepper strong")).not.toHaveText(thisWeek!);
  await guest.locator(".session-card", { hasNot: guest.locator(".full-label") }).first().getByRole("link").click();
  await guest.getByRole("link", { name: "Book this class" }).click();
  await guest.getByRole("link", { name: "Book as a guest" }).click();
  await guest.getByLabel("Your name").fill(name);
  await guest.getByLabel("Mobile number").fill(`09${uid().slice(-8)}`);
  await guest.getByRole("button", { name: "Zalo" }).click();
  await guest.getByLabel("Email").fill(`g${uid()}@example.com`);
  await guest.getByRole("button", { name: "Book, pay on the day" }).click();
  await expect(guest.getByRole("heading", { name: "you're booked" })).toBeVisible();

  await staffLogin(page, "manager@village.test");
  const row = page.locator(".contact-row", { hasText: name });
  await expect(row).toContainText("New · guest");
  await expect(row).toContainText("prefers Zalo");
  await expect(row.getByRole("link", { name: "Zalo" })).toHaveAttribute("href", /zalo\.me\/09/);
  await row.getByRole("button", { name: "Contacted ✓" }).click();
  await expect(page.locator(".contact-row", { hasText: name })).toHaveCount(0);
});

test("create a weekly session, then refuse an overlapping one", async ({ page }) => {
  await staffLogin(page, "manager@village.test");
  await page.goto("/staff/calendar");
  await page.getByRole("link", { name: "+ New session" }).click();
  const title = `Yoga ${uid()}`;
  await page.getByLabel("Title").fill(title);
  // A quiet time slot on a date well ahead.
  const d = new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10);
  await page.getByLabel("Date").fill(d);
  await page.getByLabel("Start").fill("06:00");
  await page.getByLabel("Length (minutes)").fill("45");
  await page.getByRole("button", { name: "Every week" }).click();
  const until = new Date(Date.now() + 34 * 86400000).toISOString().slice(0, 10);
  await page.getByLabel("Until").fill(until);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText(/Created [23] sessions/)).toBeVisible();

  await page.goto(`/staff/sessions/new?date=${d}`);
  await page.getByLabel("Title").fill("Clash");
  await page.getByLabel("Start").fill("06:15");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator(".notice-error")).toContainText("overlaps another session");
});

test("drag a session on the calendar to move it", async ({ page }) => {
  await staffLogin(page, "manager@village.test");
  const d = new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10);
  await page.goto(`/staff/sessions/new?date=${d}`);
  const title = `Move me ${uid()}`;
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Start").fill("07:00");
  await page.getByLabel("Length (minutes)").fill("30");
  await page.getByRole("button", { name: "Create" }).click();
  await page.goto(`/staff/calendar?view=day&date=${d}`);
  const block = page.locator(".staff-block", { hasText: title });
  await expect(block).toContainText("7:00");
  page.once("dialog", (dialog) => dialog.accept());
  const box = (await block.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 8);
  await page.mouse.down();
  await page.mouse.move(box.x + 20, box.y + 8 + 28, { steps: 5 }); // half an hour lower (56px per hour)
  await page.mouse.up();
  await expect(page.locator(".staff-block", { hasText: title })).toContainText("7:30");
});

test("add a customer, sell a pack, book them in and check them in", async ({ page }) => {
  await staffLogin(page, "manager@village.test");
  const name = `Walk In ${uid()}`;
  await page.goto("/staff/customers/new");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Mobile number").fill(`09${uid().slice(-8)}`);
  await page.getByRole("button", { name: "Save customer" }).click();
  await expect(page.getByText("Customer added.")).toBeVisible();

  await page.getByText("Sell a pack").click();
  await page.getByRole("button", { name: "Sell and record payment" }).click();
  await expect(page.getByText("Pack sold and payment recorded.")).toBeVisible();
  const packs = page.locator("section", { has: page.getByRole("heading", { name: "packs" }) });
  await expect(packs.locator(".list-row", { hasText: "10-class pack" })).toContainText("10 of 10 left");

  await page.getByRole("link", { name: "Book in" }).click();
  const session = page.getByLabel("Session");
  const option = await session.locator("option", { hasText: /Pilates Flow/ }).nth(3).getAttribute("value");
  await session.selectOption(option!);
  await page.getByRole("button", { name: "Book", exact: true }).click();
  await expect(packs.locator(".list-row", { hasText: "10-class pack" })).toContainText("9 of 10 left");

  await page.goto(`/staff/sessions/${option}/check-in`);
  const row = page.locator(".checkin-row", { hasText: name });
  await row.getByRole("button", { name: "Here" }).click();
  await expect(page.locator(".checkin-row", { hasText: name }).getByRole("button", { name: "Here" })).toHaveAttribute("aria-pressed", "true");
});

test("instructors: their sessions, no catalog, can't sell packs", async ({ page }) => {
  await staffLogin(page, "instructor@village.test");
  await expect(page.getByRole("link", { name: "Catalog" })).toHaveCount(0);
  await page.goto("/staff/today");
  await expect(page.getByRole("heading", { name: "my sessions" })).toBeVisible();
  await expect(page.locator(".sess-row").first()).toBeVisible();
  await page.goto("/staff/catalog");
  await expect(page.getByText("That page is for managers only.")).toBeVisible();
});

test("managers change prices in the catalog", async ({ page }) => {
  await staffLogin(page, "manager@village.test");
  await page.goto("/staff/catalog");
  const form = page.locator("form", { has: page.locator('input[name="name"][value="20-class pack"]') });
  await form.getByLabel("Price (VND)").fill("7200000");
  await form.getByRole("button", { name: "Save" }).click();
  await expect(form.getByText("Saved. Price changes apply to new sales only.")).toBeVisible();
});
