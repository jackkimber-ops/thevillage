"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { account, ActionError, type ContactMethod } from "@/lib/data";
import { isEmail, toE164 } from "@/lib/phone";
import { safeNext } from "@/lib/safe-next";

export type FormState = { error?: string } | undefined;

export async function sendCodeAction(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const next = safeNext(form.get("next"));
  if (!isEmail(email)) return { error: "invalid_email" };
  try {
    await account().sendCode(email, next);
  } catch (e) {
    return { error: e instanceof ActionError ? e.code : "code_not_sent" };
  }
  redirect(`/login/code?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`);
}

export async function verifyCodeAction(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  const next = safeNext(form.get("next"));
  if (code.length !== 6) return { error: "wrong_code" };
  try {
    await account().verifyCode(email, code);
  } catch (e) {
    return { error: e instanceof ActionError ? e.code : "wrong_code" };
  }
  const me = await account().me();
  redirect(me ? next : `/welcome?next=${encodeURIComponent(next)}`);
}

export async function saveDetailsAction(_: FormState, form: FormData): Promise<FormState> {
  const fullName = String(form.get("fullName") ?? "").trim();
  const phone = toE164(String(form.get("phone") ?? ""));
  const contact = String(form.get("contact") ?? "whatsapp") as ContactMethod;
  const next = safeNext(form.get("next"));
  if (!fullName) return { error: "name_required" };
  if (!phone) return { error: "invalid_phone" };
  if (!["whatsapp", "zalo", "call"].includes(contact)) return { error: "invalid_contact" };
  const locale = (await getLocale()) === "vi" ? "vi" : "en";
  try {
    await account().saveDetails({ fullName, phone, preferredContact: contact, language: locale });
    const childName = String(form.get("childName") ?? "").trim();
    const childMonth = String(form.get("childMonth") ?? "");
    if (childName && /^\d{4}-\d{2}$/.test(childMonth)) await account().addChild(childName, `${childMonth}-01`);
  } catch (e) {
    return { error: e instanceof ActionError ? e.code : "not_saved" };
  }
  redirect(next);
}

export async function signOutAction() {
  await account().signOut();
  redirect("/");
}
