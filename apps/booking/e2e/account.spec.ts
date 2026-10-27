import { expect, test, type Page } from "@playwright/test";

// Logged-in flows against the demo accounts (DEMO_DATA=1): the code is always 123456,
// and an email with "+pack" starts with a 10-class pack. Booking rules themselves are tested in supabase/tests.

let n = 0;
const uniqueEmail = (tag = "") => `parent${Date.now()}${n++}${tag}@example.com`;

async function logIn(page: Page, email: string, next = "/classes") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send me a code" }).click();
  await expect(page.getByRole("heading", { name: "check your email" })).toBeVisible();
  await page.getByLabel("your code").fill("123456");
  await page.getByRole("button", { name: "Log in" }).click();
}

async function fillDetails(page: Page, name = "Lan Pham") {
  await expect(page.getByRole("heading", { name: "your details" })).toBeVisible();
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Mobile number").fill("090 555 1234");
  await page.getByRole("button", { name: "Zalo" }).click();
  await page.getByRole("button", { name: "Save and see classes" }).click();
}

async function nextWeek(page: Page) {
  const label = await page.locator(".stepper strong").textContent();
  await page.getByRole("link", { name: "Next week", exact: true }).click();
  await expect(page.locator(".stepper strong")).not.toHaveText(label!);
}

/** A class at least a few days ahead, so the free-cancellation time hasn't passed. */
async function openBookableClass(page: Page, kind: "classes" | "open-play" = "classes") {
  await page.goto(`/classes?filter=${kind}`);
  await nextWeek(page);
  await page.locator(".session-card", { hasNot: page.locator(".full-label") }).first().getByRole("link").click();
  await page.getByRole("link", { name: kind === "classes" ? "Book this class" : "Book open play" }).click();
}

test("first login asks for your details once, then greets you", async ({ page }) => {
  const email = uniqueEmail();
  await logIn(page, email);
  await fillDetails(page);
  await expect(page.getByRole("heading", { name: "hi lan" })).toBeVisible();
  await page.goto("/menu");
  await expect(page.getByText("Lan Pham")).toBeVisible();
  await expect(page.getByText("+84905551234")).toBeVisible();
  await page.getByRole("button", { name: "Log out" }).click();
  await logIn(page, email);
  await expect(page.getByRole("heading", { name: "hi lan" })).toBeVisible();
});

test("a wrong code is refused", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(uniqueEmail());
  await page.getByRole("button", { name: "Send me a code" }).click();
  await page.getByLabel("your code").fill("000000");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.locator(".error-text")).toContainText("That code didn't work");
});

test("bookings and packages need a login", async ({ page }) => {
  await page.goto("/bookings");
  await expect(page).toHaveURL(/\/login\?next=%2Fbookings/);
  await page.goto("/packages");
  await expect(page).toHaveURL(/\/login\?next=%2Fpackages/);
});

test("book a class with a pack, then cancel it and get the credit back", async ({ page }) => {
  await logIn(page, uniqueEmail("+pack"));
  await fillDetails(page);
  await openBookableClass(page);
  await expect(page.getByText("1 credit from your 10-class pack")).toBeVisible();
  await expect(page.getByText(/^Free cancellation until 20:00 on/)).toBeVisible();
  await page.getByRole("button", { name: "Confirm booking" }).click();

  await expect(page.getByRole("heading", { name: "you're booked, Lan" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Add to my calendar" })).toHaveAttribute("href", /\/calendar$/);
  await page.getByRole("link", { name: "See my bookings" }).click();

  await expect(page.locator(".booking-row")).toHaveCount(1);

  // Change list #3: the timetable shows "Booked" for it, leading to the booking, not to a second booking.
  await page.goto("/classes?filter=classes");
  await nextWeek(page);
  const bookedCard = page.locator(".session-card", { has: page.locator(".booked-pill") });
  await expect(bookedCard).toHaveCount(1);
  await expect(bookedCard.locator(".booked-pill")).toHaveText("✓ Booked");
  await expect(bookedCard.getByRole("link", { name: "Book", exact: true })).toHaveCount(0);
  await bookedCard.locator(".booked-pill").click();
  await expect(page).toHaveURL(/\/bookings#booking-/);
  await page.goto("/classes?view=week");
  await nextWeek(page);
  await page.locator(".week-block.booked").click();
  await expect(page.getByText("You're booked into this session.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Book this class" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "See my booking" })).toHaveAttribute("href", /\/bookings#booking-/);

  await page.goto("/packages");
  await expect(page.locator(".big-number")).toHaveText("9");
  await page.goto("/bookings");
  await page.getByRole("link", { name: "Cancel" }).click();
  await expect(page.getByText("Your credit goes back to your 10-class pack.")).toBeVisible();
  await page.getByRole("button", { name: "Yes, cancel it" }).click();
  await expect(page.getByText("Booking cancelled.")).toBeVisible();
  await expect(page.getByText("No upcoming bookings.")).toBeVisible();
  await page.goto("/classes?filter=classes");
  await nextWeek(page);
  await expect(page.locator(".booked-pill")).toHaveCount(0);
  await page.goto("/packages");
  await expect(page.locator(".big-number")).toHaveText("10");
});

test("without a pack the booking is pay on the day", async ({ page }) => {
  await logIn(page, uniqueEmail());
  await fillDetails(page);
  await openBookableClass(page);
  await expect(page.locator(".pay-box")).toContainText("450,000 ₫");
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.locator(".card").first()).toContainText("Pay on the day");
  await page.goto("/bookings");
  await expect(page.locator(".booking-row")).toContainText("450,000 ₫");
});

test("open play: add a child, 150,000 per child", async ({ page }) => {
  await logIn(page, uniqueEmail());
  await fillDetails(page);
  await openBookableClass(page, "open-play");
  await expect(page.getByRole("button", { name: "Confirm booking" })).toBeDisabled();
  await page.getByLabel("Child's name").fill("Bao");
  await page.getByLabel("Month and year of birth").fill("2025-01");
  await page.getByRole("button", { name: "Add child" }).click();
  await page.getByLabel(/Bao/).check();
  await expect(page.locator(".pay-box")).toContainText("150,000 ₫");
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByText("You + Bao")).toBeVisible();
});

test("book as a guest: one pay-on-the-day booking at a time", async ({ page }) => {
  const email = uniqueEmail();
  const guestBook = async () => {
    await openBookableClass(page);
    await page.getByRole("link", { name: "Book as a guest" }).click();
    await page.getByLabel("Your name").fill("Linh Tran");
    await page.getByLabel("Mobile number").fill("0901234567");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Book, pay on the day" }).click();
  };
  await guestBook();
  await expect(page.getByRole("heading", { name: "you're booked" })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  await page.goto("/classes?filter=classes");
  await nextWeek(page);
  await nextWeek(page);
  await page.locator(".session-card", { hasNot: page.locator(".full-label") }).first().getByRole("link").click();
  await page.getByRole("link", { name: "Book this class" }).click();
  await page.getByRole("link", { name: "Book as a guest" }).click();
  await page.getByLabel("Your name").fill("Linh Tran");
  await page.getByLabel("Mobile number").fill("0901234567");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Book, pay on the day" }).click();
  await expect(page.locator(".error-text")).toContainText("You already have a booking to pay on the day");
  // An error never wipes what was typed.
  await expect(page.getByLabel("Your name")).toHaveValue("Linh Tran");
  await expect(page.getByLabel("Email")).toHaveValue(email);
});
