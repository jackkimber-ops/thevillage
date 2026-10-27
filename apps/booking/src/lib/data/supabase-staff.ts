import "server-only";
import { createClient } from "@/lib/supabase/server";
import { ActionError, type BookingStatus } from "./types";
import type { CustomerProfile, PackType, RosterRow, SessionType, StaffApi, StaffSession } from "./staff-types";

function check(error: { code?: string; message: string } | null) {
  if (!error) return;
  if (error.code === "P0001") throw new ActionError(error.message);
  if (error.code === "42501") throw new ActionError("not_allowed");
  throw new Error(error.message);
}

type TRow = {
  session_id: string; session_type_id: string; kind: StaffSession["kind"]; title: string; starts_at: string; ends_at: string;
  status: StaffSession["status"]; instructor_id: string | null; instructor_name: string | null; capacity: number | null;
  taken: number; unpaid: number; hire_customer: string | null; notes: string | null;
};
const toSession = (r: TRow): StaffSession => ({
  id: r.session_id, sessionTypeId: r.session_type_id, kind: r.kind, title: r.title, startsAt: r.starts_at, endsAt: r.ends_at,
  status: r.status, instructorId: r.instructor_id, instructorName: r.instructor_name, capacity: r.capacity, taken: r.taken,
  unpaid: r.unpaid, hireCustomer: r.hire_customer, notes: r.notes,
});

const balances = (ledger: Array<{ customer_pack_id: string; amount: number }>) =>
  ledger.reduce<Record<string, number>>((acc, l) => ({ ...acc, [l.customer_pack_id]: (acc[l.customer_pack_id] ?? 0) + l.amount }), {});

export const supabaseStaff: StaffApi = {
  async me() {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data } = await supabase.from("staff_roles").select("user_id, role, display_name, instructor_access, active").eq("user_id", auth.user.id).maybeSingle();
    if (!data || !data.active) return null;
    return { userId: data.user_id, role: data.role, name: data.display_name, access: data.instructor_access };
  },

  async instructors() {
    const supabase = await createClient();
    const { data, error } = await supabase.from("staff_roles").select("user_id, display_name").eq("active", true).order("display_name");
    check(error);
    return (data ?? []).map((r) => ({ userId: r.user_id, name: r.display_name }));
  },

  async sessionTypes(): Promise<SessionType[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("session_types").select("*").order("kind").order("name");
    check(error);
    return (data ?? []).map((t) => ({
      id: t.id, kind: t.kind, name: t.name, defaultMinutes: t.default_minutes, defaultCapacity: t.default_capacity,
      dropInPriceVnd: t.drop_in_price_vnd === null ? null : Number(t.drop_in_price_vnd), active: t.active, description: t.description,
    }));
  },

  async packTypes(): Promise<PackType[]> {
    const supabase = await createClient();
    const [{ data, error }, { data: covers }] = await Promise.all([
      supabase.from("pack_types").select("*").order("price_vnd"),
      supabase.from("pack_type_covers").select("pack_type_id, session_type_id"),
    ]);
    check(error);
    return (data ?? []).map((p) => ({
      id: p.id, name: p.name, credits: p.credits, priceVnd: Number(p.price_vnd), validityMonths: p.validity_months,
      validityDays: p.validity_days, isIntro: p.is_intro, onSale: p.on_sale,
      coversSessionTypeIds: (covers ?? []).filter((c) => c.pack_type_id === p.id).map((c) => c.session_type_id),
    }));
  },

  async timetable(from, to) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("staff_timetable", { p_from: from.toISOString(), p_to: to.toISOString() });
    check(error);
    return (data as TRow[]).map(toSession);
  },

  async session(id) {
    const supabase = await createClient();
    const { data: s } = await supabase.from("sessions").select("starts_at").eq("id", id).maybeSingle();
    if (!s) return null;
    const t = new Date(s.starts_at).getTime();
    const { data, error } = await supabase.rpc("staff_timetable", { p_from: new Date(t - 60000).toISOString(), p_to: new Date(t + 60000).toISOString() });
    check(error);
    const row = (data as TRow[]).find((r) => r.session_id === id);
    return row ? toSession(row) : null;
  },

  async roster(sessionId): Promise<RosterRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("bookings")
      .select("id, status, parents, children, credits, unpaid, paid_at, amount_due_vnd, free_trial, first_booking, customers(id, full_name, phone), customer_packs(name), booking_children(customer_children(name))")
      .eq("session_id", sessionId)
      .neq("status", "cancelled")
      .order("created_at");
    check(error);
    type Row = {
      id: string; status: BookingStatus; parents: number; children: number; credits: number; unpaid: boolean; paid_at: string | null;
      amount_due_vnd: number; free_trial: boolean; first_booking: boolean;
      customers: { id: string; full_name: string; phone: string | null };
      customer_packs: { name: string } | null;
      booking_children: Array<{ customer_children: { name: string } | null }>;
    };
    return ((data ?? []) as unknown as Row[]).map((b) => ({
      bookingId: b.id, customerId: b.customers.id, fullName: b.customers.full_name, phone: b.customers.phone,
      childNames: b.booking_children.map((c) => c.customer_children?.name).filter((n): n is string => Boolean(n)),
      children: b.children, parents: b.parents, status: b.status, unpaid: b.unpaid, paid: b.paid_at !== null,
      amountDueVnd: Number(b.amount_due_vnd), credits: b.credits, packName: b.customer_packs?.name ?? null,
      freeTrial: b.free_trial, firstBooking: b.first_booking,
    }));
  },

  async contactList() {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("contact_list");
    check(error);
    return (data as Array<Record<string, unknown>>).map((r) => ({
      bookingId: r.booking_id as string, customerId: r.customer_id as string, fullName: r.full_name as string,
      phone: r.phone as string | null, preferredContact: r.preferred_contact as "whatsapp", firstBooking: r.first_booking as boolean,
      unpaid: r.unpaid as boolean, amountDueVnd: Number(r.amount_due_vnd), source: r.source as "online",
      freeTrial: r.free_trial as boolean, children: r.children as number, sessionId: r.session_id as string,
      title: r.title as string, startsAt: r.starts_at as string,
    }));
  },

  async markContacted(id) {
    const { error } = await (await createClient()).rpc("mark_contacted", { p_booking_id: id });
    check(error);
  },
  async markAttendance(id, status) {
    const { error } = await (await createClient()).rpc("mark_attendance", { p_booking_id: id, p_status: status });
    check(error);
  },
  async cancelBooking(id, reason) {
    const { data, error } = await (await createClient()).rpc("cancel_booking", { p_booking_id: id, p_reason: reason });
    check(error);
    return data as BookingStatus;
  },
  async restoreCredit(id, reason) {
    const { error } = await (await createClient()).rpc("restore_credit", { p_booking_id: id, p_reason: reason });
    check(error);
  },
  async extendPack(id, newLastDay, reason) {
    const { error } = await (await createClient()).rpc("extend_pack", { p_customer_pack_id: id, p_new_valid_to: newLastDay, p_reason: reason });
    check(error);
  },

  async createSessions(n) {
    const { data, error } = await (await createClient()).rpc("create_sessions", {
      p_session_type_id: n.sessionTypeId, p_title: n.title, p_starts_at: n.startsAt, p_minutes: n.minutes,
      p_capacity: n.capacity, p_instructor_id: n.instructorId, p_repeat_until: n.repeatUntil, p_notes: n.notes,
    });
    check(error);
    return data as string[];
  },
  async updateSession(id, u) {
    const { error } = await (await createClient()).rpc("update_session", {
      p_session_id: id, p_title: u.title, p_starts_at: u.startsAt, p_minutes: u.minutes, p_capacity: u.capacity,
      p_instructor_id: u.instructorId, p_notes: u.notes,
    });
    check(error);
  },
  async cancelSession(id, reason) {
    const { data, error } = await (await createClient()).rpc("cancel_session", { p_session_id: id, p_reason: reason });
    check(error);
    return data as number;
  },

  async searchCustomers(q) {
    const { data, error } = await (await createClient()).rpc("search_customers", { p_query: q });
    check(error);
    return (data as Array<{ customer_id: string; full_name: string; phone: string | null; email: string | null; deactivated: boolean }>).map((r) => ({
      customerId: r.customer_id, fullName: r.full_name, phone: r.phone, email: r.email, deactivated: r.deactivated,
    }));
  },

  async customer(id): Promise<CustomerProfile | null> {
    const supabase = await createClient();
    const { data: c } = await supabase
      .from("customers")
      .select("id, full_name, phone, email, preferred_contact, language, deactivated_at, needs_review, created_at, customer_children(id, name, birth_month)")
      .eq("id", id)
      .maybeSingle();
    if (!c) return null;
    const [{ data: packs }, { data: ledger }, { data: bookings }] = await Promise.all([
      supabase.from("customer_packs").select("id, name, credits, valid_from, valid_to, paused_days").eq("customer_id", id).order("valid_to"),
      supabase.from("credit_ledger").select("customer_pack_id, kind, amount, reason, created_at").eq("customer_id", id).order("id", { ascending: false }),
      supabase.from("bookings")
        .select("id, status, unpaid, paid_at, amount_due_vnd, credits, free_trial, customer_pack_id, sessions(id, title, starts_at), booking_children(customer_children(name))")
        .eq("customer_id", id),
    ]);
    const bal = balances(ledger ?? []);
    const packName = (pid: string | null) => (packs ?? []).find((p) => p.id === pid)?.name ?? null;
    type B = { id: string; status: BookingStatus; unpaid: boolean; paid_at: string | null; amount_due_vnd: number; credits: number;
      free_trial: boolean; customer_pack_id: string | null; sessions: { id: string; title: string; starts_at: string };
      booking_children: Array<{ customer_children: { name: string } | null }> };
    const rows = (bookings ?? []) as unknown as B[];
    return {
      customerId: c.id, fullName: c.full_name, phone: c.phone, email: c.email, preferredContact: c.preferred_contact,
      language: c.language, deactivated: c.deactivated_at !== null, needsReview: c.needs_review, createdAt: c.created_at,
      children: (c.customer_children ?? []).map((k: { id: string; name: string; birth_month: string }) => ({ id: k.id, name: k.name, birthMonth: k.birth_month })),
      packs: (packs ?? []).map((p) => {
        const last = new Date(`${p.valid_to}T00:00:00Z`);
        last.setUTCDate(last.getUTCDate() + p.paused_days);
        return { id: p.id, name: p.name, credits: p.credits, remaining: bal[p.id] ?? 0, validFrom: p.valid_from, lastDay: last.toISOString().slice(0, 10) };
      }),
      bookings: rows.map((b) => ({
        id: b.id, sessionId: b.sessions.id, title: b.sessions.title, startsAt: b.sessions.starts_at, status: b.status,
        unpaid: b.unpaid, paid: b.paid_at !== null, amountDueVnd: Number(b.amount_due_vnd), credits: b.credits,
        packName: packName(b.customer_pack_id), freeTrial: b.free_trial,
        childNames: b.booking_children.map((x) => x.customer_children?.name).filter((n): n is string => Boolean(n)),
      })).sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
      ledger: (ledger ?? []).map((l) => ({ at: l.created_at, kind: l.kind, amount: l.amount, reason: l.reason, packName: packName(l.customer_pack_id) ?? "" })),
      hadFreeTrial: rows.some((b) => b.free_trial && b.status !== "cancelled"),
    };
  },

  async addCustomer(d) {
    const { data, error } = await (await createClient()).rpc("staff_add_customer", {
      p_full_name: d.fullName, p_phone: d.phone, p_email: d.email, p_preferred_contact: d.preferredContact,
      p_children: d.children.map((k) => ({ name: k.name, birth_month: k.birthMonth })),
    });
    check(error);
    return data as string;
  },
  async bookCustomer(d) {
    const { data, error } = await (await createClient()).rpc("book_session", {
      p_session_id: d.sessionId, p_customer_id: d.customerId, p_child_ids: d.childIds, p_unnamed_children: d.unnamedChildren,
      p_parents: d.parents, p_free_trial: d.freeTrial, p_override_times: d.override,
    });
    check(error);
    return data as string;
  },
  async sellPack(d) {
    const { data, error } = await (await createClient()).rpc("sell_pack", {
      p_customer_id: d.customerId, p_pack_type_id: d.packTypeId, p_method: d.method, p_valid_from: d.validFrom,
    });
    check(error);
    return data as string;
  },
  async recordPayment(d) {
    const { error } = await (await createClient()).rpc("record_payment", {
      p_customer_id: d.customerId, p_amount_vnd: d.amountVnd, p_method: d.method, p_paid_for: d.paidFor,
      p_booking_id: d.bookingId, p_session_id: d.sessionId ?? null, p_note: d.note,
    });
    check(error);
  },
  async sessionPayments(sessionId) {
    const { data, error } = await (await createClient())
      .from("payments").select("amount_vnd, method, note, recorded_at").eq("session_id", sessionId).order("recorded_at");
    check(error);
    return (data ?? []).map((p) => ({ amountVnd: Number(p.amount_vnd), method: p.method, note: p.note, recordedAt: p.recorded_at }));
  },

  async updateCustomer(id, d) {
    const { error } = await (await createClient()).rpc("staff_update_customer", {
      p_customer_id: id, p_full_name: d.fullName, p_phone: d.phone, p_email: d.email, p_preferred_contact: d.preferredContact, p_language: d.language,
    });
    check(error);
  },
  async setCustomerActive(id, active) {
    const { error } = await (await createClient()).rpc("set_customer_active", { p_customer_id: id, p_active: active });
    check(error);
  },
  async saveChild(customerId, childId, name, birthMonth) {
    const { error } = await (await createClient()).rpc("staff_save_child", {
      p_customer_id: customerId, p_child_id: childId, p_name: name, p_birth_month: birthMonth,
    });
    check(error);
  },
  async removeChild(childId) {
    const { error } = await (await createClient()).rpc("staff_remove_child", { p_child_id: childId });
    check(error);
  },

  async savePackType(p) {
    const supabase = await createClient();
    const row = { name: p.name, credits: p.credits, price_vnd: p.priceVnd, validity_months: p.validityMonths, validity_days: p.validityDays, is_intro: p.isIntro, on_sale: p.onSale };
    const { data, error } = p.id
      ? await supabase.from("pack_types").update(row).eq("id", p.id).select("id").single()
      : await supabase.from("pack_types").insert(row).select("id").single();
    check(error);
    const id = data!.id as string;
    check((await supabase.from("pack_type_covers").delete().eq("pack_type_id", id)).error);
    if (p.coversSessionTypeIds.length) {
      check((await supabase.from("pack_type_covers").insert(p.coversSessionTypeIds.map((s) => ({ pack_type_id: id, session_type_id: s })))).error);
    }
  },
  async saveSessionType(t) {
    const supabase = await createClient();
    const row = { kind: t.kind, name: t.name, default_minutes: t.defaultMinutes, default_capacity: t.defaultCapacity, drop_in_price_vnd: t.dropInPriceVnd, active: t.active, description: t.description };
    const colours: Record<string, string> = { class: "#C3BF94", open_play: "#FFBEA1", private_hire: "#E8E3C5", workshop: "#E88D6D" };
    const { error } = t.id
      ? await supabase.from("session_types").update(row).eq("id", t.id)
      : await supabase.from("session_types").insert({ ...row, colour: colours[t.kind] });
    check(error);
  },
};
