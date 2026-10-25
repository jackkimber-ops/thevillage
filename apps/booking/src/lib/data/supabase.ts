import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DataSource, SessionDetail, StudioSettings, TimetableEntry } from "./types";

type TimetableRow = {
  session_id: string;
  session_type_id: string;
  kind: TimetableEntry["kind"];
  title: string;
  starts_at: string;
  ends_at: string;
  instructor_name: string | null;
  price_vnd: number | null;
  capacity: number | null;
  places_left: number | null;
  is_full: boolean;
};

const toEntry = (r: TimetableRow): TimetableEntry => ({
  id: r.session_id,
  sessionTypeId: r.session_type_id,
  kind: r.kind,
  title: r.title,
  startsAt: r.starts_at,
  endsAt: r.ends_at,
  instructorName: r.instructor_name,
  priceVnd: r.price_vnd === null ? null : Number(r.price_vnd),
  capacity: r.capacity,
  placesLeft: r.places_left,
  isFull: r.is_full,
});

function intervalDays(interval: string): number {
  // Postgres returns e.g. "1 mon" or "30 days".
  const months = /(\d+) mon/.exec(interval);
  const days = /(\d+) day/.exec(interval);
  return (months ? Number(months[1]) * 31 : 0) + (days ? Number(days[1]) : 0) || 31;
}

export const supabaseData: DataSource = {
  async settings(): Promise<StudioSettings> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("studio_settings").select("*").single();
    if (error) throw error;
    return {
      name: data.name,
      address: data.address,
      openingHours: data.opening_hours,
      contactEmail: data.contact_email,
      contactPhone: data.contact_phone,
      whatsappUrl: data.whatsapp_url,
      zaloUrl: data.zalo_url,
      messengerUrl: data.messenger_url,
      facebookUrl: data.facebook_url,
      instagramUrl: data.instagram_url,
      mapsUrl: data.maps_url,
      cancelCutoffTime: String(data.cancel_cutoff_time).slice(0, 5),
      bookingWindowDays: intervalDays(String(data.booking_window)),
    };
  },

  async timetable(from, to) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("timetable", { p_from: from.toISOString(), p_to: to.toISOString() });
    if (error) throw error;
    return (data as TimetableRow[]).map(toEntry);
  },

  async session(id, locale): Promise<SessionDetail | null> {
    const supabase = await createClient();
    const { data: s } = await supabase.from("sessions").select("id, starts_at, session_type_id").eq("id", id).maybeSingle();
    if (!s) return null;
    const day = new Date(s.starts_at);
    const { data: rows, error } = await supabase.rpc("timetable", {
      p_from: new Date(day.getTime() - 60_000).toISOString(),
      p_to: new Date(day.getTime() + 60_000).toISOString(),
    });
    if (error) throw error;
    const row = (rows as TimetableRow[]).find((r) => r.session_id === id);
    if (!row) return null;
    const { data: type } = await supabase
      .from("session_types")
      .select("description, description_vi, suits, suits_vi, bring, bring_vi, colour, picture_url")
      .eq("id", s.session_type_id)
      .single();
    return {
      ...toEntry(row),
      description: (locale === "vi" ? type?.description_vi : null) ?? type?.description ?? null,
      suits: (locale === "vi" ? type?.suits_vi : null) ?? type?.suits ?? null,
      bring: (locale === "vi" ? type?.bring_vi : null) ?? type?.bring ?? null,
      colour: type?.colour ?? "#C3BF94",
      pictureUrl: type?.picture_url ?? null,
    };
  },
};
