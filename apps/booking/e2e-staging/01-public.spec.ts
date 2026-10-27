import { expect, pageIsHealthy, shot, test } from "./helpers";

// Pages anyone can open, in English and Vietnamese, on a phone and a computer.

const pages = ["/", "/classes", "/classes?view=week", "/classes?view=month", "/hire", "/menu", "/privacy", "/terms", "/login", "/staff/login"];

for (const path of pages) {
  test(`opens cleanly: ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(`${m.text()} ${m.location().url}`); });
    page.on("requestfailed", (r) => { if (!r.url().includes("sentry.io") && r.failure()?.errorText !== "net::ERR_ABORTED") errors.push(`${r.url()} ${r.failure()?.errorText}`); });
    const res = await page.goto(path);
    expect(res?.status()).toBeLessThan(400);
    await pageIsHealthy(page);
    await shot(page, `en${path.replace(/[/?=]/g, "_")}`);
    // Sentry (error reports) can't be reached from the test machine; that isn't a site problem.
    expect(errors.filter((e) => !e.includes("sentry.io") && !e.includes("ERR_TUNNEL_CONNECTION_FAILED")), "browser errors").toEqual([]);
  });
}

test("home: coming up shows bookable sessions, the map loads and opens Google Maps", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "coming up" })).toBeVisible();
  await expect(page.locator(".session-card").first()).toBeVisible();
  await expect(page.getByText("New sessions are on their way")).toHaveCount(0);
  const map = page.locator(".map-picture img");
  await expect(map).toBeVisible();
  expect(await map.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator("a.map-picture")).toHaveAttribute("href", /google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/);
  await expect(page.getByText("47/1 Quốc Hương")).toBeVisible();
});

test("no Vercel toolbar or feedback button on the page", async ({ page }) => {
  await page.goto("/classes");
  await page.waitForTimeout(3000);
  await expect(page.locator("vercel-live-feedback, #vercel-live-feedback, [data-vercel-toolbar]")).toHaveCount(0);
  await expect(page.getByText("Continue with Vercel")).toHaveCount(0);
});

test("timetable: List, Week and Month with the November sessions and class badges", async ({ page }) => {
  await page.goto("/classes?date=2026-11-16");
  await expect(page.locator(".session-card").first()).toBeVisible();
  await expect(page.locator(".session-card", { hasText: "Core & Cuddle" }).first()).toContainText(/of 10 places left/);
  const openPlay = page.locator(".session-card", { hasText: "Open Play" }).first();
  await expect(openPlay).not.toContainText("places left");
  await expect(page.locator(".session-card img").first()).toBeVisible();
  await page.locator(".pills").getByRole("link", { name: "Open play", exact: true }).click();
  await expect(page.locator(".session-card", { hasText: "Core & Cuddle" })).toHaveCount(0);
  await page.goto("/classes?view=week&date=2026-11-16");
  await expect(page.locator(".week-col")).toHaveCount(7);
  await expect(page.locator(".week-block", { hasText: "Open Play" }).first()).toBeVisible();
  await shot(page, "week-16nov");
  await page.goto("/classes?view=month&date=2026-11-16");
  await expect(page.locator(".legend")).toContainText("Open Play");
  await expect(page.locator(".legend")).toContainText("Core & Cuddle");
  await shot(page, "month-nov");
});

test("session page: details, price and the way to book", async ({ page }) => {
  await page.goto("/classes?date=2026-11-16&filter=classes");
  await page.locator(".session-card").first().getByRole("link").first().click();
  await expect(page.getByRole("link", { name: "Book this class" })).toBeVisible();
  await expect(page.getByText(/1 class credit, or 450,000 ₫ on the day/)).toBeVisible();
  await pageIsHealthy(page);
  await shot(page, "session-page");
  await page.getByRole("link", { name: "Book this class" }).click();
  await expect(page.getByRole("link", { name: "Book as a guest" })).toBeVisible();
  await shot(page, "book-choice");
});

test("message us links come from the studio settings", async ({ page }) => {
  await page.goto("/menu");
  await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", /wa\.me\/84933834068/);
  await expect(page.getByRole("link", { name: "Zalo" })).toHaveAttribute("href", /zalo\.me\/(0|84)933834068/);
  await expect(page.getByRole("link", { name: "Messenger" })).toHaveAttribute("href", /m\.me\/thevillage\.saigon/);
  await expect(page.getByRole("link", { name: "Email" })).toHaveAttribute("href", "mailto:thevillage.saigon@gmail.com");
});

test("hire the studio builds the WhatsApp message", async ({ page }) => {
  await page.goto("/hire");
  await page.getByLabel("Date").fill("2026-12-05");
  await page.getByLabel("Start time").fill("13:00");
  await page.getByRole("button", { name: "2 hours" }).click();
  await page.getByLabel("Group size").fill("12");
  await expect(page.getByRole("link", { name: "Send on WhatsApp" })).toHaveAttribute("href", /wa\.me\/84933834068\?text=.*2026-12-05/);
  await expect(page.getByText(/24 hours/)).toBeVisible();
});

test("Vietnamese: every customer page switches over", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Tap for Tiếng Việt/ }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  for (const path of ["/", "/classes", "/classes?view=month", "/hire", "/menu", "/privacy", "/terms", "/login"]) {
    await page.goto(path);
    await pageIsHealthy(page);
    await shot(page, `vi${path.replace(/[/?=]/g, "_")}`);
  }
  await page.goto("/classes?date=2026-11-16");
  await page.locator(".session-card").first().getByRole("link").first().click();
  await pageIsHealthy(page);
  await shot(page, "vi-session-page");
  // Switch back so other tests on this browser start in English.
  await page.goto("/");
  await page.getByRole("button", { name: /Chạm để chọn English/ }).click();
});

test("logged-out pages that need a login send you to it", async ({ page }) => {
  await page.goto("/bookings");
  await expect(page).toHaveURL(/\/login\?next=%2Fbookings/);
  await page.goto("/packages");
  await expect(page).toHaveURL(/\/login\?next=%2Fpackages/);
  await page.goto("/staff");
  await expect(page).toHaveURL(/\/staff\/login/);
});

test("health check", async ({ page }) => {
  const res = await page.goto("/api/health");
  expect(await res!.json()).toMatchObject({ status: "ok", database: "ok" });
});
