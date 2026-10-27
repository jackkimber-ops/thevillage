import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { test as base, expect, type Page } from "@playwright/test";

// Full check against the staging site and staging database (see README.md in this folder).
// Test people use Resend's test inbox (delivered+…@resend.dev), so no real person is emailed.
// Everything this suite creates is named "QA …" and removed by cleanup.sql.

const SUPABASE_URL = process.env.STAGING_SUPABASE_URL!;
const SERVICE_KEY = process.env.STAGING_SERVICE_KEY!;
const PROJECT_REF = process.env.STAGING_PROJECT_REF!;

/** Every test page carries the staging-only pass for the bot check (see src/lib/bot-check.ts). */
export const test = base.extend({
  context: async ({ context, baseURL }, use) => {
    if (process.env.QA_BYPASS_TOKEN) await context.addCookies([{ name: "qa-bypass", value: process.env.QA_BYPASS_TOKEN, url: baseURL! }]);
    await use(context);
  },
});
export { expect };

export const QA_MANAGER = "delivered+qa-manager@resend.dev";
export const QA_INSTRUCTOR = "delivered+qa-instructor@resend.dev";

let n = 0;
export const uid = () => `${Date.now().toString(36)}${(n++).toString(36)}${Math.floor(Math.random() * 1000)}`;
export const qaEmail = (tag = "") => `delivered+qa-${tag}${uid()}@resend.dev`;
/** A made-up Vietnamese mobile (09x xxx xxxx), different each time. */
export const qaPhone = () => `09${String(Date.now()).slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;

function curl(args: string[]): string {
  return execFileSync("curl", ["-sS", "--fail-with-body", ...args], { encoding: "utf8" });
}

/** Runs SQL on the staging database (Management API, as the database owner). */
export function sql<T = Record<string, unknown>>(query: string): T[] {
  const out = curl([
    "-X", "POST", `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    "-H", "Content-Type: application/json", "--data", JSON.stringify({ query }),
  ]);
  return JSON.parse(out) as T[];
}

function admin(path: string, body: unknown): Record<string, unknown> {
  const out = curl([
    "-X", "POST", `${SUPABASE_URL}/auth/v1/admin/${path}`,
    "-H", `apikey: ${SERVICE_KEY}`, "-H", `Authorization: Bearer ${SERVICE_KEY}`,
    "-H", "Content-Type: application/json", "--data", JSON.stringify(body),
  ]);
  return JSON.parse(out);
}

/** A fresh 6-digit login code for this email, without sending an email (the user is created if new). */
export function loginCode(email: string): string {
  try {
    admin("users", { email, email_confirm: true });
  } catch {
    // already exists
  }
  const link = admin("generate_link", { type: "magiclink", email });
  const code = (link.email_otp ?? (link.properties as Record<string, string> | undefined)?.email_otp) as string;
  if (!code) throw new Error(`No code for ${email}: ${JSON.stringify(link)}`);
  return code;
}

/** Customer login through the real code screen. */
export async function customerLogin(page: Page, email: string, next = "/classes") {
  const code = loginCode(email);
  await page.goto(`/login/code?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`);
  await page.getByLabel("your code").fill(code);
  await page.getByRole("button", { name: "Log in" }).click();
}

export async function staffLogin(page: Page, email = QA_MANAGER) {
  const code = loginCode(email);
  await page.goto(`/staff/login/code?email=${encodeURIComponent(email)}&next=%2Fstaff`);
  await page.getByLabel("your code").fill(code);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("navigation", { name: "Staff menu" }).or(page.getByRole("navigation", { name: "Staff sections" })).first()).toBeAttached();
}

export async function fillDetails(page: Page, name: string, phone = qaPhone()) {
  await expect(page.getByRole("heading", { name: "your details" })).toBeVisible();
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Mobile number").fill(phone);
  await page.getByRole("button", { name: "Zalo" }).click();
  await page.getByRole("button", { name: /^Save/ }).click();
  await expect(page).not.toHaveURL(/\/welcome/);
}

/** Vietnam date (YYYY-MM-DD) `days` from today. */
export function vnDate(days: number): string {
  return new Date(Date.now() + 7 * 3600000 + days * 86400000).toISOString().slice(0, 10);
}

/** A QA session straight in the database (for times the UI won't let us pick, such as the past). */
export function qaSession(o: { title: string; start: string; minutes?: number; typeId?: string; capacity?: number | null }): string {
  const typeId = o.typeId ?? "00000000-0000-4000-8000-000000000004";
  const cap = o.capacity === undefined ? 10 : o.capacity;
  const [row] = sql<{ id: string }>(`
    insert into public.sessions (session_type_id, title, starts_at, ends_at, capacity)
    values ('${typeId}', '${o.title.replace(/'/g, "''")}', '${o.start}+07', '${o.start}+07'::timestamptz + interval '${o.minutes ?? 60} minutes', ${cap ?? "null"})
    returning id`);
  return row.id;
}

const SHOTS = process.env.SHOTS_DIR ?? "test-results/shots";
mkdirSync(SHOTS, { recursive: true });
/** Full-page screenshot for the visual review. */
export async function shot(page: Page, name: string) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({ path: `${SHOTS}/${deviceOf(page)}-${name}.png`, fullPage: true });
}
function deviceOf(page: Page) {
  const w = page.viewportSize()?.width ?? 0;
  return w < 600 ? "phone" : "desktop";
}

/** Fails on broken images, horizontal scrolling and server error pages. */
export async function pageIsHealthy(page: Page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  const broken = await page.locator("img").evaluateAll((imgs) =>
    (imgs as HTMLImageElement[]).filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src));
  expect(broken, "broken images").toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "page scrolls sideways").toBeLessThanOrEqual(1);
  await expect(page.getByText(/Application error|Internal Server Error|This page could not be found/)).toHaveCount(0);
}

/** Staff "Sell a pack": choose the 10-class pack and record the payment. */
export async function sellTenPack(page: Page) {
  await page.getByText("Sell a pack").click();
  const value = await page.getByLabel("Pack", { exact: true }).locator("option", { hasText: "10-class pack" }).getAttribute("value");
  await page.getByLabel("Pack", { exact: true }).selectOption(value!);
  await page.getByRole("button", { name: "Sell and record payment" }).click();
  await expect(page.getByText("Pack sold and payment recorded.")).toBeVisible();
}
