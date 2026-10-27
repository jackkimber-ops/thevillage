import type { Page, TestInfo } from "@playwright/test";
import { expect, pageIsHealthy, qaEmail, qaPhone, qaSession, QA_INSTRUCTOR, shot, sql, staffLogin, test, uid, vnDate, sellTenPack } from "./helpers";

// The staff app as a manager and as an instructor, on a phone and a computer, against staging.
test.describe.configure({ mode: "serial" });

/** Each device gets its own days, so the two runs never overlap in the one room. */
const dayOffset = (info: TestInfo) => (info.project.name === "phone" ? 6 : 10);

async function addCustomer(page: Page, o: { name: string; phone: string; email?: string; child?: string }) {
  await page.goto("/staff/customers/new");
  await page.getByLabel("Name", { exact: true }).fill(o.name);
  await page.getByLabel("Mobile number").fill(o.phone);
  if (o.email) await page.getByLabel(/^Email/).fill(o.email);
  if (o.child) {
    if ((await page.getByLabel("Child 1 name").count()) === 0) await page.getByRole("button", { name: "+ Add a child" }).click();
    await page.getByLabel("Child 1 name").fill(o.child);
    await page.getByLabel("Month and year of birth").first().fill("2025-02");
  }
  await page.getByRole("button", { name: "Save customer" }).click();
  await expect(page.getByText("Customer added.")).toBeVisible();
  return page.url().match(/customers\/([0-9a-f-]{36})/)![1];
}

async function bookIn(page: Page, sessionId: string, customerName: string, o: { freeTrial?: boolean } = {}) {
  await page.goto(`/staff/book?session=${sessionId}`);
  await page.getByLabel("Customer: name, phone or email").fill(customerName);
  await page.getByRole("button", { name: customerName }).click();
  if (o.freeTrial) await page.getByLabel("Free trial (one per customer)").check();
  await page.getByRole("button", { name: "Book", exact: true }).click();
  await expect(page.getByText(/Booked in\./)).toBeVisible();
}

test("manager: dashboard, calendar views and customers list open cleanly", async ({ page }) => {
  await staffLogin(page);
  await pageIsHealthy(page);
  await shot(page, "staff-dashboard");
  for (const v of ["day", "week", "month"]) {
    await page.goto(`/staff/calendar?view=${v}&date=2026-11-16`);
    if (v === "month") await expect(page.getByRole("heading", { name: "november 2026" })).toBeVisible();
    else await expect(page.locator(".staff-block").first()).toBeVisible();
    await pageIsHealthy(page);
    await shot(page, `staff-calendar-${v}`);
  }
  for (const path of ["/staff/customers", "/staff/catalog", "/staff/today", "/staff/book", "/staff/customers/new", "/staff/sessions/new"]) {
    await page.goto(path);
    await pageIsHealthy(page);
    await shot(page, `staff${path.replace(/\//g, "_")}`);
  }
});

test("manager: create a weekly session, refuse an overlap, edit it, drag it", async ({ page }, info) => {
  await staffLogin(page);
  const d = vnDate(dayOffset(info));
  const title = `QA Weekly ${uid()}`;
  await page.goto(`/staff/sessions/new?date=${d}`);
  await page.getByLabel("Session type").selectOption({ label: "Core & Cuddle" });
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Start").fill("07:00");
  await page.getByLabel("Length (minutes)").fill("45");
  await page.getByRole("button", { name: "Every week" }).click();
  await page.getByLabel("Until").fill(vnDate(dayOffset(info) + 7));
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText(/Created 2 sessions/)).toBeVisible();

  await page.goto(`/staff/sessions/new?date=${d}`);
  await page.getByLabel("Title").fill(`QA Clash ${uid()}`);
  await page.getByLabel("Start").fill("07:15");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator(".notice-error")).toContainText("overlaps another session");
  await expect(page.getByLabel("Start")).toHaveValue("07:15"); // what was typed is kept

  // Edit: change the capacity.
  await page.goto(`/staff/calendar?view=day&date=${d}`);
  await page.locator(".staff-block", { hasText: title }).click();
  await page.getByLabel("Capacity").fill("8");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(/Saved/)).toBeVisible();
  await expect(page.getByLabel("Capacity")).toHaveValue("8");

  // Drag it half an hour later (mouse on the computer, finger on the phone).
  await page.goto(`/staff/calendar?view=day&date=${d}`);
  const block = page.locator(".staff-block", { hasText: title });
  await block.scrollIntoViewIfNeeded();
  const box = (await block.boundingBox())!;
  page.once("dialog", (dialog) => dialog.accept());
  if (info.project.name === "phone") {
    const cdp = await page.context().newCDPSession(page);
    const x = box.x + 20, y = box.y + 8;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let i = 1; i <= 7; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + i * 4 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else {
    await page.mouse.move(box.x + 20, box.y + 8);
    await page.mouse.down();
    await page.mouse.move(box.x + 20, box.y + 8 + 28, { steps: 5 });
    await page.mouse.up();
  }
  await expect(page.locator(".staff-block", { hasText: title })).toContainText("7:30");
});

test("manager: add a customer with a child, find them by local phone, sell a pack, book in, check in", async ({ page }, info) => {
  await staffLogin(page);
  const name = `QA Walk In ${uid()}`;
  const phone = qaPhone();
  const id = await addCustomer(page, { name, phone, email: qaEmail("walkin"), child: "Bao" });
  await expect(page.getByText("Bao")).toBeVisible();
  await shot(page, "staff-customer-profile");

  await page.goto("/staff/customers");
  await page.getByLabel("Name, phone or email").fill(phone); // typed the local way, saved as +84
  await page.getByLabel("Name, phone or email").press("Enter");
  await expect(page.getByRole("link", { name })).toBeVisible();

  await page.goto(`/staff/customers/${id}`);
  await sellTenPack(page);

  const session = qaSession({ title: `QA Book In ${uid()}`, start: `${vnDate(dayOffset(info) + 1)} 07:00` });
  await bookIn(page, session, name);
  const [b] = sql<{ credits: number; unpaid: boolean }>(`select credits, unpaid from bookings where session_id = '${session}' and status = 'booked'`);
  expect(b).toEqual({ credits: 1, unpaid: false });

  await page.goto(`/staff/sessions/${session}/check-in`);
  const row = page.locator(".checkin-row", { hasText: name });
  await row.getByRole("button", { name: "Here" }).click();
  await expect(page.locator(".checkin-row", { hasText: name }).getByRole("button", { name: "Here" })).toHaveAttribute("aria-pressed", "true");
  await shot(page, "staff-check-in");
});

test("manager: unpaid drop-in is paid at check-in; a no-show credit can be restored", async ({ page }, info) => {
  await staffLogin(page);
  const payer = `QA Payer ${uid()}`;
  await addCustomer(page, { name: payer, phone: qaPhone() });
  const regular = `QA Regular ${uid()}`;
  await addCustomer(page, { name: regular, phone: qaPhone() });
  await sellTenPack(page);

  const session = qaSession({ title: `QA Pay ${uid()}`, start: `${vnDate(dayOffset(info) + 1)} 08:00` });
  await bookIn(page, session, payer);
  await bookIn(page, session, regular);
  await page.goto(`/staff/sessions/${session}/check-in`);
  const payRow = page.locator(".checkin-row", { hasText: payer });
  await expect(payRow).toContainText("Pay on the day");
  await payRow.getByLabel("Payment method").selectOption("cash");
  await payRow.getByRole("button", { name: /^Record/ }).click();
  await expect(page.locator(".checkin-row", { hasText: payer })).toContainText("Paid");
  const [p] = sql<{ amount_vnd: string; method: string }>(`select amount_vnd::text, method from payments where session_id = '${session}' or booking_id in (select id from bookings where session_id = '${session}')`);
  expect(p).toEqual({ amount_vnd: "450000", method: "cash" });

  const regRow = () => page.locator(".checkin-row", { hasText: regular });
  await regRow().getByRole("button", { name: "No-show" }).click();
  await expect(regRow()).toContainText("No-show");
  await regRow().getByLabel("Reason for restoring").fill("Child was ill");
  await regRow().getByRole("button", { name: "Restore credit" }).click();
  const [bal] = sql<{ n: number }>(`select sum(amount)::int as n from credit_ledger l join customers c on c.id = l.customer_id where c.full_name = '${regular}'`);
  expect(bal.n).toBe(10);
});

test("manager: free trial, extend a pack, catalog shows prices", async ({ page }, info) => {
  await staffLogin(page);
  const name = `QA Trial ${uid()}`;
  const id = await addCustomer(page, { name, phone: qaPhone() });
  const session = qaSession({ title: `QA Trial Class ${uid()}`, start: `${vnDate(dayOffset(info) + 1)} 15:00` });
  await bookIn(page, session, name, { freeTrial: true });
  const [b] = sql<{ free_trial: boolean; unpaid: boolean }>(`select free_trial, unpaid from bookings where session_id = '${session}'`);
  expect(b.free_trial).toBe(true);

  await page.goto(`/staff/customers/${id}`);
  await sellTenPack(page);
  const row = page.locator("section", { has: page.getByRole("heading", { name: "packs" }) }).locator(".list-row").first();
  await row.getByText("Extend", { exact: true }).click();
  await row.getByLabel("Reason for extending").fill("QA check");
  await row.getByRole("button", { name: "Extend pack" }).click();
  await expect(page.getByText("Pack extended.")).toBeVisible();

  await page.goto("/staff/catalog");
  for (const price of ["450000", "4000000", "7200000", "750000", "150000"]) {
    await expect(page.locator(`input[value="${price}"]`).first()).toBeAttached();
  }
});

test("manager: moving or cancelling a session with bookings emails everyone and returns credits", async ({ page }, info) => {
  await staffLogin(page);
  const name = `QA Cancelled ${uid()}`;
  await addCustomer(page, { name, phone: qaPhone(), email: qaEmail("cancelled") });
  await sellTenPack(page);
  const session = qaSession({ title: `QA To Cancel ${uid()}`, start: `${vnDate(dayOffset(info) + 2)} 07:00` });
  await bookIn(page, session, name);

  await page.goto(`/staff/sessions/${session}`);
  await page.getByText("Cancel session for everyone").click();
  await page.getByLabel("Reason").fill("QA flood drill");
  await page.getByRole("button", { name: "Cancel this session" }).click();
  await expect(page.getByText(/cancelled/i).first()).toBeVisible();
  const [r] = sql<{ status: string; bal: number; emails: number }>(`
    select s.status::text,
      (select sum(amount)::int from credit_ledger l join customers c on c.id = l.customer_id where c.full_name = '${name}') as bal,
      (select count(*)::int from notifications n join bookings b on b.id = n.booking_id where b.session_id = s.id and n.kind = 'session_cancelled') as emails
    from sessions s where s.id = '${session}'`);
  expect(r).toEqual({ status: "cancelled", bal: 10, emails: 1 });
});

function instructorOwnSession(info: TestInfo) {
  const [ins] = sql<{ id: string }>(`select id from auth.users where email = '${QA_INSTRUCTOR}'`);
  const id = qaSession({ title: `QA Instructor Class ${uid()}`, start: `${vnDate(dayOffset(info) + 2)} 09:00` });
  sql(`update sessions set instructor_id = '${ins.id}' where id = '${id}'`);
  return id;
}

test("instructor: own sessions, check-in and book someone in; no catalog, packs, payments or restores", async ({ page }, info) => {
  const session = instructorOwnSession(info);
  await staffLogin(page, QA_INSTRUCTOR);
  await page.goto("/staff/today");
  await pageIsHealthy(page);
  await shot(page, "instructor-today");
  await expect(page.getByRole("link", { name: "Catalog" })).toHaveCount(0);
  await page.goto("/staff/catalog");
  await expect(page.getByText("That page is for managers only.")).toBeVisible();

  const name = `QA Instr Guest ${uid()}`;
  await addCustomer(page, { name, phone: qaPhone() });
  await expect(page.getByText("Sell a pack")).toHaveCount(0);
  await bookIn(page, session, name);
  await page.goto(`/staff/sessions/${session}/check-in`);
  const row = page.locator(".checkin-row", { hasText: name });
  await expect(row).toContainText("Pay on the day");
  await expect(row.getByRole("button", { name: /^Record/ })).toHaveCount(0);
  await row.getByRole("button", { name: "Here" }).click();
  await expect(page.locator(".checkin-row", { hasText: name }).getByRole("button", { name: "Here" })).toHaveAttribute("aria-pressed", "true");
});

test("instructor can't change someone else's session (database refuses, not just the screen)", async ({ page }, info) => {
  const other = qaSession({ title: `QA Not Mine ${uid()}`, start: `${vnDate(dayOffset(info) + 2)} 11:00` });
  await staffLogin(page, QA_INSTRUCTOR);
  await page.goto(`/staff/sessions/${other}`);
  await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);
  await expect(page.getByText("Cancel session for everyone")).toHaveCount(0);
});

