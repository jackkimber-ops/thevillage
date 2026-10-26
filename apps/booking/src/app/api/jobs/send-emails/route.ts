import { timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import { renderEmail } from "@/emails/render";
import type { EmailData, EmailKind } from "@/emails/types";
import type { SessionKind, StudioSettings } from "@/lib/data/types";
import { createAdminClient } from "@/lib/supabase/admin";

// Sends queued customer emails. Called every minute by pg_cron (see the notifications migration)
// with "Authorization: Bearer <CRON_SECRET>". Safe to run twice: rows are claimed with SKIP LOCKED.

function authorised(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  return Boolean(secret) && given.length === secret!.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret!));
}

type Claimed = {
  id: number; kind: EmailKind; payload: { old_starts_at?: string; reason?: string }; email: string; language: "en" | "vi";
  first_name: string; session_title: string; session_kind: SessionKind; starts_at: string; ends_at: string; child_names: string[];
  parents: number; credits: number; pack_name: string | null; unpaid: boolean; amount_due_vnd: number; free_trial: boolean; cancel_cutoff: string;
};

export async function POST(request: Request) {
  if (!authorised(request)) return new Response("Unauthorised", { status: 401 });
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const appUrl = process.env.APP_URL;
  if (!key || !from || !appUrl) return Response.json({ error: "Email isn't configured" }, { status: 503 });

  const db = createAdminClient();
  const { data: s, error: settingsError } = await db.from("studio_settings").select("*").single();
  if (settingsError) return Response.json({ error: settingsError.message }, { status: 500 });
  const settings: StudioSettings = {
    name: s.name, address: s.address, openingHours: s.opening_hours, contactEmail: s.contact_email, contactPhone: s.contact_phone,
    whatsappUrl: s.whatsapp_url, zaloUrl: s.zalo_url, messengerUrl: s.messenger_url, facebookUrl: s.facebook_url,
    instagramUrl: s.instagram_url, mapsUrl: s.maps_url, cancelCutoffTime: String(s.cancel_cutoff_time).slice(0, 5), bookingWindowDays: 31,
  };

  const { data, error } = await db.rpc("claim_notifications", { p_limit: 25 });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const resend = new Resend(key);
  let sent = 0;
  let failed = 0;

  for (const n of data as Claimed[]) {
    const d: EmailData = {
      kind: n.kind, lang: n.language, firstName: n.first_name, title: n.session_title, sessionKind: n.session_kind,
      startsAt: n.starts_at, endsAt: n.ends_at, childNames: n.child_names ?? [], parents: n.parents, credits: n.credits,
      packName: n.pack_name, unpaid: n.unpaid, amountDueVnd: Number(n.amount_due_vnd), freeTrial: n.free_trial,
      cancelCutoff: n.cancel_cutoff, oldStartsAt: n.payload?.old_starts_at ?? null, reason: n.payload?.reason ?? null, appUrl, settings,
    };
    try {
      const email = await renderEmail(d);
      const res = await resend.emails.send(
        { from, to: n.email, replyTo: settings.contactEmail, subject: email.subject, html: email.html, text: email.text },
        { idempotencyKey: `notification-${n.id}` },
      );
      if (res.error) throw new Error(res.error.message);
      await db.rpc("finish_notification", { p_id: n.id, p_ok: true, p_provider_id: res.data?.id ?? null });
      sent++;
    } catch (e) {
      await db.rpc("finish_notification", { p_id: n.id, p_ok: false, p_error: (e as Error).message });
      failed++;
    }
  }
  await db.from("job_runs").insert({ job: "send_emails", ok: failed === 0, detail: { sent, failed } });
  return Response.json({ sent, failed });
}
