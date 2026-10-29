"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ActionError, staffApi, type ContactMethod } from "@/lib/data";
import { isEmail, toE164 } from "@/lib/phone";
import { parseVnd } from "@/lib/vnd";

export type StaffFormState = { error?: string; ok?: string } | undefined;
const code = (e: unknown) => (e instanceof ActionError ? e.code : "generic");
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const back = (f: FormData, fallback: string) => {
  const b = str(f, "back");
  return b.startsWith("/staff") ? b : fallback;
};

export async function markContactedAction(form: FormData) {
  await staffApi().markContacted(str(form, "bookingId"));
  revalidatePath("/staff");
}

export async function attendanceAction(form: FormData) {
  const status = str(form, "status") as "booked" | "attended" | "no_show";
  try {
    await staffApi().markAttendance(str(form, "bookingId"), status);
  } catch (e) {
    redirect(`${back(form, "/staff")}?error=${code(e)}`);
  }
  revalidatePath(back(form, "/staff"));
  redirect(back(form, "/staff")); // fresh page: drops an old "Booked in." note
}

export async function staffCancelBookingAction(form: FormData) {
  try {
    await staffApi().cancelBooking(str(form, "bookingId"), str(form, "reason") || null);
  } catch (e) {
    redirect(`${back(form, "/staff")}?error=${code(e)}`);
  }
  revalidatePath(back(form, "/staff"));
  redirect(back(form, "/staff")); // fresh page: drops an old "Booked in." note
}

export async function restoreCreditAction(form: FormData) {
  try {
    await staffApi().restoreCredit(str(form, "bookingId"), str(form, "reason") || "Restored by a manager");
  } catch (e) {
    redirect(`${back(form, "/staff")}?error=${code(e)}`);
  }
  revalidatePath(back(form, "/staff"));
  redirect(back(form, "/staff")); // fresh page: drops an old "Booked in." note
}

export async function extendPackAction(form: FormData) {
  try {
    await staffApi().extendPack(str(form, "packId"), str(form, "newLastDay"), str(form, "reason"));
  } catch (e) {
    redirect(`${back(form, "/staff")}?error=${code(e)}`);
  }
  redirect(`${back(form, "/staff")}?extended=1`);
}

export async function recordPaymentAction(form: FormData) {
  const amount = parseVnd(str(form, "amount")); // "450k", "1.5m", "450,000"; never negative
  if (amount === null) redirect(`${back(form, "/staff")}?error=invalid_amount`);
  try {
    await staffApi().recordPayment({
      customerId: str(form, "customerId") || null,
      amountVnd: amount,
      method: str(form, "method") as "qr",
      paidFor: (str(form, "paidFor") || "drop_in") as "drop_in",
      bookingId: str(form, "bookingId") || null,
      sessionId: str(form, "sessionId") || null,
      note: str(form, "note") || null,
    });
  } catch (e) {
    redirect(`${back(form, "/staff")}?error=${code(e)}`);
  }
  if (str(form, "paidFor") === "private_hire") redirect(`${back(form, "/staff")}?paid=1`);
  revalidatePath(back(form, "/staff"));
}

// S22: change a customer's details (email is their login: a new one moves the login to that address).
export async function updateCustomerAction(_: StaffFormState, form: FormData): Promise<StaffFormState> {
  const id = str(form, "customerId");
  const phone = toE164(str(form, "phone"));
  const email = str(form, "email").toLowerCase();
  if (!str(form, "fullName")) return { error: "name_required" };
  if (!phone) return { error: "invalid_phone" };
  if (email && !isEmail(email)) return { error: "invalid_email" };
  try {
    await staffApi().updateCustomer(id, {
      fullName: str(form, "fullName"), phone, email: email || null,
      preferredContact: (str(form, "contact") || "whatsapp") as ContactMethod,
      language: str(form, "language") === "vi" ? "vi" : "en",
    });
  } catch (e) {
    return { error: code(e) };
  }
  redirect(`/staff/customers/${id}?updated=1`);
}

export async function setCustomerActiveAction(form: FormData) {
  const id = str(form, "customerId");
  const active = str(form, "active") === "1";
  try {
    await staffApi().setCustomerActive(id, active);
  } catch (e) {
    redirect(`/staff/customers/${id}?error=${code(e)}`);
  }
  redirect(`/staff/customers/${id}?${active ? "reactivated" : "deactivated"}=1`);
}

// S21: add or change a child (name and month/year of birth), or remove one.
export async function saveChildAction(form: FormData) {
  const id = str(form, "customerId");
  const month = str(form, "birthMonth");
  if (!str(form, "name")) redirect(`/staff/customers/${id}?error=name_required`);
  if (!/^\d{4}-\d{2}$/.test(month)) redirect(`/staff/customers/${id}?error=invalid_birth_month`);
  try {
    await staffApi().saveChild(id, str(form, "childId") || null, str(form, "name"), `${month}-01`);
  } catch (e) {
    redirect(`/staff/customers/${id}?error=${code(e)}`);
  }
  redirect(`/staff/customers/${id}?child=1`);
}

export async function removeChildAction(form: FormData) {
  const id = str(form, "customerId");
  try {
    await staffApi().removeChild(str(form, "childId"));
  } catch (e) {
    redirect(`/staff/customers/${id}?error=${code(e)}`);
  }
  redirect(`/staff/customers/${id}?child_removed=1`);
}

/** Studio-local date + time from the form, as an instant (Saigon, UTC+7). */
function startsAt(form: FormData) {
  const d = str(form, "date");
  const t = str(form, "time");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !/^\d{2}:\d{2}$/.test(t)) throw new ActionError("invalid_time");
  return new Date(`${d}T${t}:00+07:00`).toISOString();
}

function capacity(form: FormData) {
  const c = str(form, "capacity");
  return c === "" ? null : Number(c);
}

export async function saveSessionAction(_: StaffFormState, form: FormData): Promise<StaffFormState> {
  const id = str(form, "id");
  let target = "/staff/calendar";
  try {
    const common = {
      title: str(form, "title"),
      startsAt: startsAt(form),
      minutes: Number(str(form, "minutes")),
      capacity: capacity(form),
      instructorId: str(form, "instructorId") || null,
      notes: str(form, "notes") || null,
    };
    if (!common.title) return { error: "title_required" };
    // A new session in the past can't be booked or checked in, so don't create one by mistake.
    if (!id && new Date(common.startsAt).getTime() + common.minutes * 60000 <= Date.now()) return { error: "session_in_past" };
    if (id) {
      await staffApi().updateSession(id, common);
      target = `/staff/sessions/${id}?saved=1`;
    } else {
      const ids = await staffApi().createSessions({
        ...common,
        sessionTypeId: str(form, "sessionTypeId"),
        repeatUntil: str(form, "repeat") === "weekly" ? str(form, "repeatUntil") || null : null,
      });
      target = `/staff/sessions/${ids[0]}?created=${ids.length}`;
    }
  } catch (e) {
    return { error: code(e) };
  }
  redirect(target);
}

/** Drag on the calendar: same length, new start. */
export async function moveSessionAction(id: string, newStartIso: string): Promise<{ error?: string }> {
  try {
    const api = staffApi();
    const s = await api.session(id);
    if (!s) return { error: "session_not_found" };
    const minutes = Math.round((new Date(s.endsAt).getTime() - new Date(s.startsAt).getTime()) / 60000);
    await api.updateSession(id, { title: s.title, startsAt: newStartIso, minutes, capacity: s.capacity, instructorId: s.instructorId, notes: s.notes });
  } catch (e) {
    return { error: code(e) };
  }
  revalidatePath("/staff/calendar");
  return {};
}

export async function cancelSessionAction(form: FormData) {
  const id = str(form, "id");
  try {
    await staffApi().cancelSession(id, str(form, "reason"));
  } catch (e) {
    redirect(`/staff/sessions/${id}?error=${code(e)}`);
  }
  // Back to the week the session was in, not today.
  const date = str(form, "date");
  redirect(`/staff/calendar?cancelled=1${/^\d{4}-\d{2}-\d{2}$/.test(date) ? `&date=${date}` : ""}`);
}

// Private hire: the price agreed on chat, so the payment section can show what's still to pay.
export async function setHirePriceAction(form: FormData) {
  const id = str(form, "sessionId");
  const text = str(form, "price");
  const price = text ? parseVnd(text) : null;
  if (text && price === null) redirect(`/staff/sessions/${id}?error=invalid_amount`);
  try {
    await staffApi().setHirePrice(id, price);
  } catch (e) {
    redirect(`/staff/sessions/${id}?error=${code(e)}`);
  }
  redirect(`/staff/sessions/${id}?price=1`);
}

export async function addCustomerAction(_: StaffFormState, form: FormData): Promise<StaffFormState> {
  const phone = toE164(str(form, "phone"));
  const email = str(form, "email").toLowerCase();
  if (!str(form, "fullName")) return { error: "name_required" };
  if (!phone) return { error: "invalid_phone" };
  if (email && !isEmail(email)) return { error: "invalid_email" };
  const children: Array<{ name: string; birthMonth: string }> = [];
  for (const i of [1, 2, 3]) {
    const name = str(form, `child${i}Name`);
    const month = str(form, `child${i}Month`);
    if (name && !/^\d{4}-\d{2}$/.test(month)) return { error: "child_needs_birth_month" }; // never drop a child silently
    if (name) children.push({ name, birthMonth: `${month}-01` });
  }
  let id: string;
  try {
    id = await staffApi().addCustomer({
      fullName: str(form, "fullName"), phone, email: email || null,
      preferredContact: (str(form, "contact") || "whatsapp") as ContactMethod, children,
    });
  } catch (e) {
    return { error: code(e) };
  }
  const next = str(form, "next");
  redirect(next.startsWith("/staff") ? `${next}${next.includes("?") ? "&" : "?"}customer=${id}` : `/staff/customers/${id}?added=1`);
}

export async function staffBookAction(_: StaffFormState, form: FormData): Promise<StaffFormState> {
  const sessionId = str(form, "sessionId");
  const customerId = str(form, "customerId");
  if (!sessionId) return { error: "choose_session" };
  if (!customerId) return { error: "choose_customer" };
  try {
    await staffApi().bookCustomer({
      sessionId, customerId,
      childIds: form.getAll("child").map(String),
      unnamedChildren: Number(str(form, "unnamed") || 0),
      parents: str(form, "secondParent") === "on" ? 2 : 1,
      freeTrial: str(form, "freeTrial") === "on",
      override: str(form, "override") === "on",
    });
  } catch (e) {
    return { error: code(e) };
  }
  const to = back(form, `/staff/sessions/${sessionId}/check-in`);
  redirect(`${to}${to.includes("?") ? "&" : "?"}booked=1`);
}

export async function sellPackAction(_: StaffFormState, form: FormData): Promise<StaffFormState> {
  const customerId = str(form, "customerId");
  try {
    await staffApi().sellPack({
      customerId, packTypeId: str(form, "packTypeId"), method: str(form, "method") as "qr", validFrom: str(form, "validFrom") || null,
    });
  } catch (e) {
    return { error: code(e) };
  }
  redirect(`/staff/customers/${customerId}?sold=1`);
}

export async function savePackTypeAction(_: StaffFormState, form: FormData): Promise<StaffFormState> {
  const validity = str(form, "validityUnit");
  const price = parseVnd(str(form, "price"));
  if (price === null) return { error: "invalid_amount" };
  const n = Number(str(form, "validity"));
  try {
    await staffApi().savePackType({
      id: str(form, "id") || null, name: str(form, "name"), credits: Number(str(form, "credits")),
      priceVnd: price, validityMonths: validity === "months" ? n : null,
      validityDays: validity === "days" ? n : null, isIntro: str(form, "isIntro") === "on", onSale: str(form, "onSale") === "on",
      coversSessionTypeIds: form.getAll("covers").map(String),
    });
  } catch (e) {
    return { error: code(e) };
  }
  revalidatePath("/staff/catalog");
  return { ok: "saved" };
}

export async function saveSessionTypeAction(_: StaffFormState, form: FormData): Promise<StaffFormState> {
  const priceText = str(form, "price");
  const price = priceText ? parseVnd(priceText) : null;
  if (priceText && price === null) return { error: "invalid_amount" };
  const cap = str(form, "capacity");
  try {
    await staffApi().saveSessionType({
      id: str(form, "id") || null, kind: str(form, "kind") as "class", name: str(form, "name"),
      defaultMinutes: Number(str(form, "minutes")), defaultCapacity: cap ? Number(cap) : null,
      dropInPriceVnd: price, active: str(form, "active") === "on", description: str(form, "description") || null,
    });
  } catch (e) {
    return { error: code(e) };
  }
  revalidatePath("/staff/catalog");
  return { ok: "saved" };
}

export async function findCustomersAction(q: string) {
  const api = staffApi();
  const hits = await api.searchCustomers(q);
  if (hits.length > 0) return hits;
  // Nothing for the whole text (say "Rob, rob@example.com"): try each word on its own.
  const words = [...new Set(q.split(/[\s,;]+/).filter((w) => w.length >= 2))];
  if (words.length < 2) return hits;
  const found = new Map<string, (typeof hits)[number]>();
  for (const list of await Promise.all(words.map((w) => api.searchCustomers(w)))) {
    for (const h of list) found.set(h.customerId, h);
  }
  return [...found.values()].slice(0, 20);
}

export async function customerChildrenAction(id: string) {
  const c = await staffApi().customer(id);
  if (!c) return null;
  const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10); // Saigon date
  // Packs they can still use, so staff see credits left before booking (team feedback 29 Oct).
  const packs = c.packs.filter((p) => p.lastDay >= today).map((p) => ({ name: p.name, remaining: p.remaining, lastDay: p.lastDay }));
  return { name: c.fullName, children: c.children, hadFreeTrial: c.hadFreeTrial, packs };
}
