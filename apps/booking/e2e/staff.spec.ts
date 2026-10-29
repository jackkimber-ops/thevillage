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
  await expect(page.locator(".staff-col.dragging")).toHaveCount(1); // stays visible, even over another day
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
  await page.getByLabel("Pack", { exact: true }).selectOption({ index: 1 });
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

  // Before the day: only Cancel booking (team feedback 29 Oct), and the credits show when choosing the customer.
  await page.goto(`/staff/sessions/${option}/check-in`);
  const future = page.locator(".checkin-row", { hasText: name });
  await expect(future.getByRole("button", { name: "Cancel booking" })).toBeVisible();
  await expect(future.getByRole("button", { name: /Here|No-show/ })).toHaveCount(0);
  await expect(page.getByText("Here and No-show appear on the day of the session.")).toBeVisible();

  // On the day: the class going on now.
  await page.goto(`/staff/book?session=demo-now`);
  await page.getByLabel("Customer: name, phone or email").fill(name);
  await page.getByRole("button", { name }).click();
  await expect(page.getByText(/10-class pack: 9 credits left/)).toBeVisible();
  await page.getByLabel(/Override booking times/).check();
  await page.getByRole("button", { name: "Book", exact: true }).click();
  await expect(page.getByText("Booked in.")).toBeVisible();
  const row = () => page.locator(".checkin-row", { hasText: name });
  await row().getByRole("button", { name: "Here" }).click();
  await expect(row().getByRole("button", { name: /Here/ })).toHaveAttribute("aria-pressed", "true");
  await expect(row().getByRole("button", { name: /Here/ })).toHaveText("Here ✓ · undo");
  await row().getByRole("button", { name: /Here/ }).click(); // undo
  await expect(row().getByRole("button", { name: "Here" })).toHaveAttribute("aria-pressed", "false");
  await expect(row().getByRole("button", { name: /Late cancel|Cancel booking/ })).toBeVisible();
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

test("managers extend a customer's pack", async ({ page }) => {
  await staffLogin(page, "manager@village.test");
  await page.goto("/staff/customers/new");
  await page.getByLabel("Name").fill(`Extend Me ${uid()}`);
  await page.getByLabel("Mobile number").fill(`09${uid().slice(-8)}`);
  await page.getByRole("button", { name: "Save customer" }).click();
  await page.getByText("Sell a pack").click();
  await page.getByLabel("Pack", { exact: true }).selectOption({ index: 1 });
  await page.getByRole("button", { name: "Sell and record payment" }).click();
  const row = page.locator("section", { has: page.getByRole("heading", { name: "packs" }) }).locator(".list-row", { hasText: "10-class pack" });
  const before = await row.locator(".muted.small").first().textContent();

  // An end date that isn't later is refused with a plain message.
  await row.getByText("Extend", { exact: true }).click();
  await row.getByLabel("New last day").fill("2020-01-01");
  await row.getByLabel("New last day").evaluate((el) => el.removeAttribute("min"));
  await row.getByLabel("Reason for extending").fill("Test");
  await row.getByRole("button", { name: "Extend pack" }).click();
  await expect(page.getByText("The new end date must be later than the pack's current end date.")).toBeVisible();

  // The suggested date (30 days later) works.
  const row2 = page.locator("section", { has: page.getByRole("heading", { name: "packs" }) }).locator(".list-row", { hasText: "10-class pack" });
  await row2.getByText("Extend", { exact: true }).click();
  await row2.getByLabel("Reason for extending").fill("Away for a month");
  await row2.getByRole("button", { name: "Extend pack" }).click();
  await expect(page.getByText("Pack extended.")).toBeVisible();
  await expect(row2.locator(".muted.small").first()).not.toHaveText(before!);
});

test("instructors don't see Extend", async ({ page }) => {
  await staffLogin(page, "instructor@village.test");
  await page.goto("/staff/customers");
  await expect(page.getByText("Extend", { exact: true })).toHaveCount(0);
});

test("book someone in: 'name, email' still finds the customer, and the greyed Book says why", async ({ page }) => {
  await staffLogin(page, "manager@village.test");
  const name = `Search Me ${uid()}`;
  await page.goto("/staff/customers/new");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Mobile number").fill(`09${uid().slice(-8)}`);
  await page.getByRole("button", { name: "Save customer" }).click();
  await expect(page.getByText("Customer added.")).toBeVisible();

  await page.goto("/staff/book");
  await expect(page.getByText("Choose a session and a customer to book.")).toBeVisible();
  await page.getByLabel("Customer: name, phone or email").fill(`nobody${uid()}`);
  await expect(page.getByText("No customer found.", { exact: false })).toBeVisible();
  await page.getByLabel("Customer: name, phone or email").fill(`${name}, someone${uid()}@example.com`);
  await page.getByRole("button", { name }).click();
  await expect(page.getByText("Choose a session to book.")).toBeVisible();
});

test.describe("on a phone", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 412, height: 839 } });

  test("drag a session with a finger to move it", async ({ page }) => {
    await staffLogin(page, "manager@village.test");
    const d = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
    await page.goto(`/staff/sessions/new?date=${d}`);
    const title = `Touch me ${uid()}`;
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Start").fill("07:00");
    await page.getByLabel("Length (minutes)").fill("30");
    await page.getByRole("button", { name: "Create" }).click();
    await page.goto(`/staff/calendar?view=day&date=${d}`);
    const block = page.locator(".staff-block", { hasText: title });
    await block.scrollIntoViewIfNeeded();
    const box = (await block.boundingBox())!;
    page.once("dialog", (dialog) => dialog.accept());
    // Real touch events (Playwright's touchscreen can only tap).
    const cdp = await page.context().newCDPSession(page);
    const x = box.x + 20, y = box.y + 8;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let i = 1; i <= 7; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + i * 4 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.locator(".staff-block", { hasText: title })).toContainText("7:30");
  });
});

test("edit a customer's details and children; deactivate stops bookings until reactivated (S21, S22)", async ({ page }) => {
  await staffLogin(page, "manager@village.test");
  const name = `Edit Me ${uid()}`;
  await page.goto("/staff/customers/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Mobile number").fill(`09${uid().slice(-8)}`);
  await page.getByRole("button", { name: "Save customer" }).click();
  await expect(page.getByText("Customer added.")).toBeVisible();

  await page.getByText("Edit details").click();
  await page.getByLabel("Name", { exact: true }).fill(`${name} Le`);
  await page.getByLabel("Email (their login)").fill(`edit${uid()}@example.com`);
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("Details saved.")).toBeVisible();
  await expect(page.getByRole("heading", { name: `${name} Le` })).toBeVisible();

  await page.getByText("+ Add a child").click();
  await page.getByLabel("Child's name").fill("Bao");
  await page.getByLabel("Month and year of birth").fill("2025-03");
  await page.getByRole("button", { name: "Add child" }).click();
  await expect(page.getByText("Child saved.")).toBeVisible();
  await expect(page.getByText("born Mar 2025")).toBeVisible();
  await page.getByText("Change", { exact: true }).click();
  await page.getByLabel("Name of Bao").fill("Bảo");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".list-row", { hasText: "Bảo" })).toBeVisible();
  await page.getByText("Change", { exact: true }).click();
  await page.getByRole("button", { name: "Remove Bảo" }).click();
  await expect(page.getByText("Child removed.")).toBeVisible();

  await page.getByRole("button", { name: "Deactivate customer" }).click();
  await expect(page.getByText(/Customer deactivated/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Book in" })).toHaveCount(0);
  await page.getByRole("button", { name: "Reactivate customer" }).click();
  await expect(page.getByRole("link", { name: "Book in" })).toBeVisible();
});

test("managers record a private hire payment (S14)", async ({ page }) => {
  await staffLogin(page, "manager@village.test");
  const d = new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10);
  await page.goto(`/staff/sessions/new?date=${d}`);
  await page.getByLabel("Session type").selectOption({ label: "Private hire" });
  await page.getByLabel("Title").fill(`Birthday ${uid()}`);
  await page.getByLabel("Start").fill("13:00");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText(/Created 1 session/)).toBeVisible();
  await page.getByLabel("Amount paid (VND)").fill("1500000");
  await page.getByLabel("Payment method").selectOption("transfer");
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByText("Payment recorded.")).toBeVisible();
  await expect(page.getByText("1,500,000 ₫ · TRANSFER")).toBeVisible();
});

test("team feedback 27 Oct: child needs a birth month, full customer list with credits, totals and extension history", async ({ page }) => {
  await staffLogin(page, "manager@village.test");
  const name = `Feedback ${uid()}`;
  await page.goto("/staff/customers/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Mobile number").fill(`09${uid().slice(-8)}`);
  await page.getByRole("button", { name: "+ Add a child" }).click();
  await page.getByLabel("Child 1 name").fill("Mi");
  await page.getByRole("button", { name: "Save customer" }).click();
  await expect(page.getByText("Add the month and year of birth for each child")).toBeVisible();
  await expect(page.getByLabel("Child 1 name")).toHaveValue("Mi"); // nothing lost
  await page.getByLabel("Month and year of birth").fill("2025-06");
  await page.getByRole("button", { name: "Save customer" }).click();
  await expect(page.getByText("Customer added.")).toBeVisible();
  await expect(page.getByText("born Jun 2025")).toBeVisible();

  await page.getByText("Sell a pack").click();
  await page.getByLabel("Pack", { exact: true }).selectOption({ index: 1 });
  await page.getByRole("button", { name: "Sell and record payment" }).click();
  await expect(page.getByText("credits left in total")).toBeVisible();
  const row = page.locator("section", { has: page.getByRole("heading", { name: "packs" }) }).locator(".list-row").first();
  await row.getByText("Extend", { exact: true }).click();
  await row.getByLabel("Reason for extending").fill("Travelling");
  await row.getByRole("button", { name: "Extend pack" }).click();
  await expect(page.getByText(/Extended .* by Phuong: .* \(Travelling\)/)).toBeVisible();

  await page.goto("/staff/customers");
  await expect(page.getByText(/customers?, A–Z/)).toBeVisible();
  await expect(page.locator("tr", { hasText: name })).toContainText("10");
});

test("a one-class drop-in: Book in from the profile, then record a payment made before the day (change #14)", async ({ page }) => {
  await staffLogin(page, "manager@village.test");
  const name = `Drop In ${uid()}`;
  await page.goto("/staff/customers/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Mobile number").fill(`09${uid().slice(-8)}`);
  await page.getByRole("button", { name: "Save customer" }).click();
  await expect(page.getByText("Coming for one class? There's no pack to sell: tap Book in and pick the class. It's pay on the day (450,000 ₫)")).toBeVisible();
  await page.getByRole("link", { name: "Book in", exact: true }).click();
  const session = page.getByLabel("Session");
  await session.selectOption((await session.locator("option", { hasText: /Pilates Flow/ }).nth(4).getAttribute("value"))!);
  await page.getByRole("button", { name: "Book", exact: true }).click();
  await expect(page.getByText("Booked in.")).toBeVisible();
  const row = page.locator("section", { has: page.getByRole("heading", { name: "upcoming bookings" }) }).locator(".list-row").first();
  await expect(row).toContainText("Pay on the day · 450,000 ₫");
  await row.getByLabel(/Payment method/).selectOption("transfer");
  await row.getByRole("button", { name: "Record 450,000 ₫" }).click();
  await expect(page.locator("section", { has: page.getByRole("heading", { name: "upcoming bookings" }) }).locator(".list-row").first()).toContainText("Paid · 450,000 ₫");
});

test("team feedback 29 Oct: amounts like 500k, private hire balance, credits in search, cancel returns to the week", async ({ page }) => {
  await staffLogin(page, "manager@village.test");
  const d = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);
  await page.goto(`/staff/sessions/new?date=${d}`);
  await page.getByLabel("Session type").selectOption({ label: "Private hire" });
  await page.getByLabel("Title").fill(`Party ${uid()}`);
  await page.getByLabel("Start").fill("14:00");
  await page.getByRole("button", { name: "Create" }).click();
  await page.getByLabel("Agreed price (VND)").fill("500k");
  await page.getByRole("button", { name: "Save price" }).click();
  await expect(page.getByText("Agreed price saved.")).toBeVisible();
  await page.getByLabel("Amount paid (VND)").fill("-20");
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByText(/Enter the amount in VND/)).toBeVisible();
  await page.getByLabel("Amount paid (VND)").fill("400k");
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByText(/Agreed 500,000 ₫ · paid 400,000 ₫ · still to pay 100,000 ₫/)).toBeVisible();

  // Cancelling a session goes back to that session's week, not today.
  await page.getByText("Cancel session for everyone").click();
  await page.getByLabel("Reason").fill("Test");
  await page.getByRole("button", { name: "Cancel this session" }).click();
  await expect(page).toHaveURL(new RegExp(`date=${d}`));

  const name = `Credit Search ${uid()}`;
  await page.goto("/staff/customers/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Mobile number").fill(`09${uid().slice(-8)}`);
  await page.getByRole("button", { name: "Save customer" }).click();
  await page.getByText("Sell a pack").click();
  await page.getByLabel("Pack", { exact: true }).selectOption({ index: 2 });
  await page.getByRole("button", { name: "Sell and record payment" }).click();
  await page.goto(`/staff/customers?q=${encodeURIComponent(name)}`);
  await expect(page.locator("thead")).toContainText("Credits left");
  await expect(page.locator("tr", { hasText: name })).toContainText("20"); // the 20-class pack
});
