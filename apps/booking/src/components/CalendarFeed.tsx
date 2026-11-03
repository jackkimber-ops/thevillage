"use client";

import { useState, useTransition } from "react";
import { calendarLinksAction, type CalendarLinks } from "@/lib/actions/calendar";

export type CalendarFeedText = {
  title: string; body: string; show: string; apple: string; google: string; copy: string; copied: string; renew: string; renewed: string; error: string;
};

// C11 (customers) and S8 (staff): subscribe once in Apple or Google Calendar; new bookings and changes appear by themselves.
// The link is made only when asked for. Titles and times only, never names.
export function CalendarFeed({ text, staff = false }: { text: CalendarFeedText; staff?: boolean }) {
  const [links, setLinks] = useState<CalendarLinks | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const get = (fresh: boolean) => start(async () => {
    setLinks(await calendarLinksAction(fresh));
    setNote(fresh ? text.renewed : null);
  });
  const ok = links && !("error" in links) ? links : null;
  return (
    <div className={`card calendar-feed${staff ? " staff-feed" : ""}`}>
      <strong>{text.title}</strong>
      <p className="muted small" style={{ margin: "2px 0 8px" }}>{text.body}</p>
      {!ok ? (
        <button type="button" className={staff ? "sbtn2" : "btn-secondary"} disabled={pending} onClick={() => get(false)}>{text.show}</button>
      ) : (
        <div className="row" style={{ gap: 10 }}>
          <a className={staff ? "sbtn2" : "btn-secondary"} href={ok.webcal}>{text.apple}</a>
          <a className={staff ? "sbtn2" : "btn-secondary"} href={ok.google} target="_blank" rel="noopener noreferrer">{text.google}</a>
          <button
            type="button"
            className="link-button"
            onClick={async () => {
              try { await navigator.clipboard.writeText(ok.https); setNote(text.copied); } catch { setNote(ok.https); }
            }}
          >
            {text.copy}
          </button>
          <button type="button" className="link-button muted" disabled={pending} onClick={() => get(true)}>{text.renew}</button>
        </div>
      )}
      {links && "error" in links && <p className="error-text" role="alert">{text.error}</p>}
      {note && <p className="muted small" role="status" style={{ margin: "6px 0 0", wordBreak: "break-all" }}>{note}</p>}
    </div>
  );
}
