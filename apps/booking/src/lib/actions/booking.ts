"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { isBot } from "@/lib/bot-check";
import { account, ActionError, type ContactMethod } from "@/lib/data";
import { isEmail, toE164 } from "@/lib/phone";

export type FormState = { error?: string } | undefined;

const code = (e: unknown) => (e instanceof ActionError ? e.code : "generic");

export async function bookAction(_: FormState, form: FormData): Promise<FormState> {
  const sessionId = String(form.get("sessionId"));
  const childIds = form.getAll("child").map(String);
  const parents = form.get("secondParent") === "on" ? 2 : 1;
  let id: string;
  try {
    id = await account().book(sessionId, childIds, parents);
  } catch (e) {
    return { error: code(e) };
  }
  redirect(`/booked/${id}`);
}

export async function addChildAction(_: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get("childName") ?? "").trim();
  const month = String(form.get("childMonth") ?? "");
  const back = String(form.get("back") ?? "/classes");
  if (!name) return { error: "child_name_required" };
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "child_month_required" };
  try {
    await account().addChild(name, `${month}-01`);
  } catch (e) {
    return { error: code(e) };
  }
  redirect(back.startsWith("/") && !back.startsWith("//") ? back : "/classes");
}

export async function cancelAction(form: FormData) {
  const id = String(form.get("bookingId"));
  try {
    await account().cancel(id);
  } catch (e) {
    redirect(`/bookings/${id}/cancel?error=${code(e)}`);
  }
  redirect("/bookings?cancelled=1");
}

export async function guestBookAction(_: FormState, form: FormData): Promise<FormState> {
  const sessionId = String(form.get("sessionId"));
  const fullName = String(form.get("fullName") ?? "").trim();
  const phone = toE164(String(form.get("phone") ?? ""));
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const contact = String(form.get("contact") ?? "whatsapp") as ContactMethod;
  if (!fullName) return { error: "name_required" };
  if (!phone) return { error: "invalid_phone" };
  if (!isEmail(email)) return { error: "invalid_email" };
  if (await isBot()) return { error: "bot_check_failed" };
  const children: Array<{ name: string; birthMonth: string }> = [];
  for (const i of [1, 2]) {
    const name = String(form.get(`child${i}Name`) ?? "").trim();
    const month = String(form.get(`child${i}Month`) ?? "");
    if (name && /^\d{4}-\d{2}$/.test(month)) children.push({ name, birthMonth: `${month}-01` });
  }
  try {
    await account().guestBook({
      sessionId, fullName, phone, email, preferredContact: contact,
      language: (await getLocale()) === "vi" ? "vi" : "en", children,
    });
  } catch (e) {
    return { error: code(e) };
  }
  redirect(`/booked/guest?session=${encodeURIComponent(sessionId)}&email=${encodeURIComponent(email)}`);
}
