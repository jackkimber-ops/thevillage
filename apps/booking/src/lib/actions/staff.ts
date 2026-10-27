"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ActionError, staffApi, type ContactMethod } from "@/lib/data";
import { isEmail, toE164 } from "@/lib/phone";

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
}

export async function staffCancelBookingAction(form: FormData) {
  try {
    await staffApi().cancelBooking(str(form, "bookingId"), str(form, "reason") || null);
  } catch (e) {
    redirect(`${back(form, "/staff")}?error=${code(e)}`);
  }
  revalidatePath(back(form, "/staff"));
}

export async function restoreCreditAction(form: FormData) {
  try {
    await staffApi().restoreCredit(str(form, "bookingId"), str(form, "reason") || "Restored by a manager");
  } catch (e) {
    redirect(`${back(form, "/staff")}?error=${code(e)}`);
  }
  revalidatePath(back(form, "/staff"));
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
  try {
    await staffApi().recordPayment({
      customerId: str(form, "customerId"),
      amountVnd: Number(str(form, "amount").replace(/\D/g, "")),
      method: str(form, "method") as "qr",
      paidFor: (str(form, "paidFor") || "drop_in") as "drop_in",
      bookingId: str(form, "bookingId") || null,
      note: str(form, "note") || null,
    });
  } catch (e) {
    redirect(`${back(form, "/staff")}?error=${code(e)}`);
  }
  revalidatePath(back(form, "/staff"));
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
  redirect("/staff/calendar?cancelled=1");
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
    if (name && /^\d{4}-\d{2}$/.test(month)) children.push({ name, birthMonth: `${month}-01` });
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
  redirect(back(form, `/staff/sessions/${sessionId}/check-in`) + "?booked=1");
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
  const n = Number(str(form, "validity"));
  try {
    await staffApi().savePackType({
      id: str(form, "id") || null, name: str(form, "name"), credits: Number(str(form, "credits")),
      priceVnd: Number(str(form, "price").replace(/\D/g, "")), validityMonths: validity === "months" ? n : null,
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
  const price = str(form, "price").replace(/\D/g, "");
  const cap = str(form, "capacity");
  try {
    await staffApi().saveSessionType({
      id: str(form, "id") || null, kind: str(form, "kind") as "class", name: str(form, "name"),
      defaultMinutes: Number(str(form, "minutes")), defaultCapacity: cap ? Number(cap) : null,
      dropInPriceVnd: price ? Number(price) : null, active: str(form, "active") === "on", description: str(form, "description") || null,
    });
  } catch (e) {
    return { error: code(e) };
  }
  revalidatePath("/staff/catalog");
  return { ok: "saved" };
}

export async function findCustomersAction(q: string) {
  return staffApi().searchCustomers(q);
}

export async function customerChildrenAction(id: string) {
  const c = await staffApi().customer(id);
  return c ? { name: c.fullName, children: c.children, hadFreeTrial: c.hadFreeTrial } : null;
}
