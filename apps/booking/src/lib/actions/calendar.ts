"use server";

import { headers } from "next/headers";
import { account } from "@/lib/data";

export type CalendarLinks = { https: string; webcal: string; google: string } | { error: string };

// C11/S8: the person's calendar feed in the forms calendar apps want. The feed itself is /api/calendar/<token>.ics.
export async function calendarLinksAction(fresh: boolean): Promise<CalendarLinks> {
  try {
    const token = await account().calendarToken(fresh);
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "book.thevillagesaigon.com";
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    const https = `${proto}://${host}/api/calendar/${token}.ics`;
    const webcal = https.replace(/^https?:/, "webcal:");
    return { https, webcal, google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}` };
  } catch {
    return { error: "generic" };
  }
}
