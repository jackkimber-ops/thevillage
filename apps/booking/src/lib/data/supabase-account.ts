import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ActionError, type Account, type BookingStatus, type MyBooking, type MyPack } from "./types";

// Database functions raise their rule failures as P0001 with a short code ("session_full").
function check(error: { code?: string; message: string } | null) {
  if (!error) return;
  if (error.code === "P0001") throw new ActionError(error.message);
  throw new Error(error.message);
}

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

type Client = Awaited<ReturnType<typeof createClient>>;

// The signed-in person's own customer id. Lists below filter on it rather than relying on RLS alone,
// because a staff member's RLS lets them read every customer's rows (a manager who also books classes
// would otherwise see everyone's bookings under "My bookings").
async function myCustomerId(supabase: Client): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("customers").select("id").eq("user_id", auth.user.id).maybeSingle();
  return data?.id ?? null;
}

export const supabaseAccount: Account = {
  async user() {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user ? { id: data.user.id, email: data.user.email ?? "" } : null;
  },

  async sendCode(email, next) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: `${await origin()}/auth/confirm?next=${encodeURIComponent(next)}` },
    });
    if (error) throw new ActionError(error.status === 429 ? "too_many_codes" : "code_not_sent");
  },

  async verifyCode(email, code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    if (error) throw new ActionError("wrong_code");
  },

  async signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
  },

  async me() {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data: c } = await supabase
      .from("customers")
      .select("id, full_name, phone, email, preferred_contact, customer_children(id, name, birth_month)")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (!c) return null;
    return {
      customerId: c.id,
      fullName: c.full_name,
      phone: c.phone,
      email: c.email,
      preferredContact: c.preferred_contact,
      children: (c.customer_children ?? []).map((k: { id: string; name: string; birth_month: string }) => ({ id: k.id, name: k.name, birthMonth: k.birth_month })),
    };
  },

  async saveDetails(d) {
    const supabase = await createClient();
    const { error } = await supabase.rpc("save_my_details", {
      p_full_name: d.fullName, p_phone: d.phone, p_preferred_contact: d.preferredContact, p_language: d.language,
    });
    check(error);
  },

  async addChild(name, birthMonth) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("add_my_child", { p_name: name, p_birth_month: birthMonth });
    check(error);
    return data as string;
  },

  async myPacks(): Promise<MyPack[]> {
    const supabase = await createClient();
    const me = await myCustomerId(supabase);
    if (!me) return [];
    const [{ data: packs, error }, { data: covers }, { data: ledger }, { data: held }] = await Promise.all([
      supabase.from("customer_packs").select("id, name, credits, valid_from, valid_to, paused_days, pack_type_id").eq("customer_id", me).order("valid_to"),
      supabase.from("pack_type_covers").select("pack_type_id, session_type_id"),
      supabase.from("credit_ledger").select("customer_pack_id, kind, amount").eq("customer_id", me),
      supabase.from("bookings").select("customer_pack_id, credits").eq("customer_id", me).eq("status", "booked").not("customer_pack_id", "is", null),
    ]);
    check(error);
    return (packs ?? []).map((p) => {
      const rows = (ledger ?? []).filter((l) => l.customer_pack_id === p.id);
      const remaining = rows.reduce((sum, l) => sum + l.amount, 0);
      const added = rows.filter((l) => ["purchase", "bonus", "adjust"].includes(l.kind)).reduce((sum, l) => sum + l.amount, 0);
      const reserved = (held ?? []).filter((b) => b.customer_pack_id === p.id).reduce((sum, b) => sum + b.credits, 0);
      const last = new Date(`${p.valid_to}T00:00:00Z`);
      last.setUTCDate(last.getUTCDate() + p.paused_days);
      return {
        id: p.id,
        name: p.name,
        credits: p.credits,
        remaining,
        reserved,
        used: Math.max(added - remaining - reserved, 0),
        validFrom: p.valid_from,
        lastDay: last.toISOString().slice(0, 10),
        pausedDays: p.paused_days,
        sessionTypeIds: (covers ?? []).filter((c) => c.pack_type_id === p.pack_type_id).map((c) => c.session_type_id),
      };
    });
  },

  async myBookings(): Promise<MyBooking[]> {
    const supabase = await createClient();
    const me = await myCustomerId(supabase);
    if (!me) return [];
    const { data, error } = await supabase
      .from("bookings")
      .select(`id, status, parents, children, credits, unpaid, amount_due_vnd, free_trial,
               sessions!inner(id, title, starts_at, ends_at, session_type_id, session_types(kind)),
               customer_packs(name), booking_children(customer_children(name))`)
      .eq("customer_id", me)
      .order("created_at", { ascending: false });
    check(error);
    type Row = {
      id: string; status: BookingStatus; parents: number; children: number; credits: number; unpaid: boolean;
      amount_due_vnd: number; free_trial: boolean;
      sessions: { id: string; title: string; starts_at: string; ends_at: string; session_type_id: string; session_types: { kind: MyBooking["session"]["kind"] } };
      customer_packs: { name: string } | null;
      booking_children: Array<{ customer_children: { name: string } | null }>;
    };
    return ((data ?? []) as unknown as Row[]).map((b) => ({
      id: b.id,
      status: b.status,
      session: {
        id: b.sessions.id, title: b.sessions.title, kind: b.sessions.session_types.kind,
        startsAt: b.sessions.starts_at, endsAt: b.sessions.ends_at, sessionTypeId: b.sessions.session_type_id,
      },
      parents: b.parents,
      children: b.children,
      childNames: b.booking_children.map((c) => c.customer_children?.name).filter((n): n is string => Boolean(n)),
      credits: b.credits,
      packName: b.customer_packs?.name ?? null,
      unpaid: b.unpaid,
      amountDueVnd: Number(b.amount_due_vnd),
      freeTrial: b.free_trial,
    }));
  },

  async book(sessionId, childIds, parents) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("book_session", { p_session_id: sessionId, p_child_ids: childIds, p_parents: parents });
    check(error);
    return data as string;
  },

  async cancel(bookingId) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("cancel_booking", { p_booking_id: bookingId });
    check(error);
    return data as BookingStatus;
  },

  async guestBook(d) {
    const { data, error } = await createAdminClient().rpc("book_as_guest", {
      p_session_id: d.sessionId,
      p_full_name: d.fullName,
      p_phone: d.phone,
      p_email: d.email,
      p_preferred_contact: d.preferredContact,
      p_language: d.language,
      p_children: d.children.map((c) => ({ name: c.name, birth_month: c.birthMonth })),
    });
    check(error);
    return data as string;
  },

  async packsOnSale() {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pack_types")
      .select("id, name, credits, price_vnd, validity_months, validity_days, is_intro")
      .eq("on_sale", true)
      .order("price_vnd");
    check(error);
    return (data ?? []).map((p) => ({
      id: p.id, name: p.name, credits: p.credits, priceVnd: Number(p.price_vnd),
      validityMonths: p.validity_months, validityDays: p.validity_days, isIntro: p.is_intro,
    }));
  },
};
