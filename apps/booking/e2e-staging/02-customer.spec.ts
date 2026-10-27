import type { Browser, Page } from "@playwright/test";
import { customerLogin, expect, test, fillDetails, pageIsHealthy, qaEmail, qaPhone, qaSession, shot, sql, staffLogin, uid, vnDate } from "./helpers";

// Customer journeys on a phone, against the real staging database.
test.skip(({ isMobile }) => !isMobile, "customer journeys run on the phone only");
test.describe.configure({ mode: "serial" });

const OPEN_PLAY = "00000000-0000-4000-8000-000000000002";
let classA: string, openPlay: string, onePlace: string, laterToday: string, verySoon: string;

/** "HH:MM" in Vietnam, `minutes` from now, rounded up to 5 minutes. */
function vnClock(minutes: number): { date: string; time: string } {
  const t = new Date(Math.ceil((Date.now() + minutes * 60000) / 300000) * 300000 + 7 * 3600000).toISOString();
  return { date: t.slice(0, 10), time: t.slice(11, 16) };
}

test.beforeAll(() => {
  const run = uid();
  classA = qaSession({ title: `QA Class ${run}`, start: `${vnDate(3)} 13:00` });
  openPlay = qaSession({ title: `QA Open Play ${run}`, start: `${vnDate(3)} 14:30`, typeId: OPEN_PLAY, capacity: null, minutes: 90 });
  onePlace = qaSession({ title: `QA One Place ${run}`, start: `${vnDate(4)} 13:00`, capacity: 1 });
  const later = vnClock(150);
  laterToday = qaSession({ title: `QA Later Today ${run}`, start: `${later.date} ${later.time}`, minutes: 30 });
  const soon = vnClock(25);
  verySoon = qaSession({ title: `QA Very Soon ${run}`, start: `${soon.date} ${soon.time}`, minutes: 20 });
});

async function guestForm(page: Page, sessionId: string, o: { name: string; phone: string; email: string; child?: string }) {
  await page.goto(`/classes/${sessionId}`);
  await page.getByRole("link", { name: /Book this class|Book open play/ }).click();
  await page.getByRole("link", { name: "Book as a guest" }).click();
  await page.getByLabel("Your name").fill(o.name);
  await page.getByLabel("Mobile number").fill(o.phone);
  await page.getByRole("button", { name: "WhatsApp" }).click();
  await page.getByLabel("Email").fill(o.email);
  if (o.child) {
    if ((await page.getByLabel("Child's name").count()) === 0) await page.getByText(/Add your child/).click();
    await page.getByLabel("Child's name").first().fill(o.child);
    await page.getByLabel(/Month and year of birth/).first().fill("2025-03");
  }
  await shot(page, `guest-form-${o.child ? "child" : "plain"}`);
  await page.getByRole("button", { name: "Book, pay on the day" }).click();
}

const guest = { name: `QA Guest ${uid()}`, phone: qaPhone(), email: qaEmail("guest") };

test("guest books a class with a child: confirmed straight away, pay on the day", async ({ page }) => {
  await guestForm(page, classA, { ...guest, child: "Mi" });
  await expect(page.getByRole("heading", { name: "you're booked" })).toBeVisible();
  await expect(page.getByText(guest.email)).toBeVisible();
  await pageIsHealthy(page);
  await shot(page, "guest-booked");
  const [c] = sql<{ phone: string; preferred_contact: string; unpaid: boolean; kids: number }>(`
    select c.phone, c.preferred_contact, b.unpaid, (select count(*) from customer_children k where k.customer_id = c.id)::int as kids
    from customers c join bookings b on b.customer_id = c.id
    where c.email = '${guest.email}' and b.session_id = '${classA}' and b.status = 'booked'`);
  expect(c).toMatchObject({ preferred_contact: "whatsapp", unpaid: true, kids: 1 });
  expect(c.phone).toMatch(/^\+849\d{8}$/);
});

test("a guest can't hold a second unpaid booking (same email, or same phone)", async ({ page }) => {
  await guestForm(page, openPlay, { ...guest, child: "Mi" });
  await expect(page.locator(".error-text")).toContainText("You already have a booking to pay on the day");
  await expect(page.getByLabel("Your name")).toHaveValue(guest.name); // nothing typed is lost
  await guestForm(page, openPlay, { ...guest, email: qaEmail("guest2"), child: "Mi" });
  await expect(page.locator(".error-text")).toContainText("You already have a booking to pay on the day");
  await shot(page, "guest-second-refused");
});

test("send me a code: the real email login screen", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(qaEmail("code"));
  await page.getByRole("button", { name: "Send me a code" }).click();
  await expect(page.getByRole("heading", { name: "check your email" })).toBeVisible();
  await shot(page, "login-code");
  await page.getByLabel("your code").fill("000000");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.locator(".error-text")).toContainText("That code didn't work");
});

test("the guest logs in later: sees the booking and can book more unpaid dates", async ({ page }) => {
  await customerLogin(page, guest.email, "/bookings");
  await expect(page.getByRole("heading", { name: "my bookings" })).toBeVisible();
  await expect(page.locator(".booking-row", { hasText: "QA Class" })).toContainText("Pay on the day");
  await shot(page, "guest-logged-in-bookings");
  await page.goto(`/classes/${openPlay}/book`);
  await page.getByLabel(/Mi/).check();
  await expect(page.locator(".pay-box")).toContainText("150,000 ₫");
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { name: /you're booked/ })).toBeVisible();
  await page.goto("/bookings");
  await expect(page.locator(".booking-row")).toHaveCount(2);
});

test("new parent: first login asks for details once, then books, sees ✓ Booked and cancels", async ({ page }) => {
  const email = qaEmail("parent");
  await customerLogin(page, email, "/classes");
  await shot(page, "welcome-details");
  await fillDetails(page, "QA Parent");
  await expect(page.getByRole("heading", { name: /hi qa/i })).toBeVisible();

  await page.goto(`/classes/${classA}/book`);
  await expect(page.locator(".pay-box")).toContainText("450,000 ₫");
  await expect(page.getByText(/^Free cancellation until 20:00 on/)).toBeVisible();
  await shot(page, "book-confirm");
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { name: "you're booked, QA" })).toBeVisible();
  await pageIsHealthy(page);
  await shot(page, "booked");

  // Add to my calendar gives a calendar file.
  const ics = await page.getByRole("link", { name: "Add to my calendar" }).getAttribute("href");
  const res = await page.request.get(ics!).catch(() => null);
  if (res) expect(res.headers()["content-type"]).toContain("text/calendar");

  await page.goto(`/classes/${classA}`);
  await expect(page.getByText("You're booked into this session.")).toBeVisible();
  await page.goto(`/classes?date=${vnDate(3)}`);
  await expect(page.locator(".session-card", { hasText: "QA Class" }).locator(".booked-pill")).toBeVisible();

  await page.goto("/bookings");
  await shot(page, "my-bookings");
  await page.locator(".booking-row", { hasText: "QA Class" }).getByRole("link", { name: "Cancel" }).click();
  await expect(page.getByText("Nothing to pay.")).toBeVisible();
  await page.getByRole("button", { name: "Yes, cancel it" }).click();
  await expect(page.getByText("Booking cancelled.")).toBeVisible();
  await expect(page.getByText("No upcoming bookings.")).toBeVisible();
});

test("a full class shows Full and can't be booked", async ({ page, browser }) => {
  await customerLogin(page, qaEmail("first"), `/classes/${onePlace}/book`);
  await fillDetails(page, "QA First");
  await page.goto(`/classes/${onePlace}/book`);
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { name: /you're booked/ })).toBeVisible();

  const other = await (await browser.newContext()).newPage();
  await other.goto(`/classes?date=${vnDate(4)}`);
  await expect(other.locator(".session-card", { hasText: "QA One Place" })).toContainText("Full");
  await other.goto(`/classes/${onePlace}`);
  await expect(other.getByText("This session is full.")).toBeVisible();
  await expect(other.getByRole("link", { name: "Book this class" })).toHaveCount(0);
  await shot(other, "full-session");
});

test("booking after the cutoff: allowed, but says it can't be cancelled online", async ({ page }) => {
  await customerLogin(page, qaEmail("late"), `/classes/${laterToday}/book`);
  await fillDetails(page, "QA Late");
  await page.goto(`/classes/${laterToday}/book`);
  await expect(page.getByText("This booking can't be cancelled online.")).toBeVisible();
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { name: /you're booked/ })).toBeVisible();
  await page.goto("/bookings");
  const row = page.locator(".booking-row", { hasText: "QA Later Today" });
  await expect(row.getByRole("link", { name: "Cancel" })).toHaveCount(0);
  await expect(row.getByRole("link", { name: "Message us" })).toBeVisible();
  await shot(page, "inside-cutoff");
});

test("less than an hour before the start, it can't be booked online", async ({ page }) => {
  await customerLogin(page, qaEmail("soon"), `/classes/${verySoon}`);
  await fillDetails(page, "QA Soon");
  await page.goto(`/classes/${verySoon}`);
  await shot(page, "very-soon");
  await expect(page.getByRole("link", { name: "Book this class" })).toHaveCount(0);
});

async function sellPack(browser: Browser, customerName: string) {
  const staff = await (await browser.newContext()).newPage();
  await staffLogin(staff);
  await staff.goto("/staff/customers");
  await staff.getByRole("searchbox").or(staff.getByLabel(/Search|name, phone or email/i)).first().fill(customerName);
  await staff.getByRole("link", { name: customerName }).first().click();
  await staff.getByText("Sell a pack").click();
  await staff.getByRole("button", { name: "Sell and record payment" }).click();
  await expect(staff.getByText("Pack sold and payment recorded.")).toBeVisible();
  await staff.close();
}

test("with a pack: unpaid bookings switch to credits, packages page adds up, cancelling returns the credit", async ({ page, browser }) => {
  const name = `QA Pack ${uid()}`;
  await customerLogin(page, qaEmail("pack"), "/classes");
  await fillDetails(page, name);
  await page.goto(`/classes/${classA}/book`);
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { name: /you're booked/ })).toBeVisible();

  await sellPack(browser, name);

  await page.goto("/bookings");
  await expect(page.locator(".booking-row", { hasText: "QA Class" })).not.toContainText("Pay on the day");
  await page.goto("/packages");
  await expect(page.locator(".big-number").first()).toHaveText("9");
  await expect(page.getByText(/1 reserved by bookings/)).toBeVisible();
  await shot(page, "packages");

  await page.goto("/bookings");
  await page.locator(".booking-row", { hasText: "QA Class" }).getByRole("link", { name: "Cancel" }).click();
  await expect(page.getByText(/Your credit goes back to your 10-class pack/)).toBeVisible();
  await page.getByRole("button", { name: "Yes, cancel it" }).click();
  await page.goto("/packages");
  await expect(page.locator(".big-number").first()).toHaveText("10");
});

test("menu: details, message us, log out", async ({ page }) => {
  await customerLogin(page, qaEmail("menu"), "/menu");
  await fillDetails(page, "QA Menu");
  await page.goto("/menu");
  await expect(page.getByText("QA Menu")).toBeVisible();
  await pageIsHealthy(page);
  await shot(page, "menu-logged-in");
  await page.getByRole("button", { name: "Log out" }).click();
  await page.goto("/bookings");
  await expect(page).toHaveURL(/\/login/);
});
