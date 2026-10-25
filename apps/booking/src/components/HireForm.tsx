"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function HireForm({ whatsappUrl, zaloUrl, earliestDate }: { whatsappUrl: string | null; zaloUrl: string | null; earliestDate: string }) {
  const t = useTranslations("hire");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [hours, setHours] = useState<1 | 2>(1);
  const [group, setGroup] = useState("");
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);

  const ready = date !== "" && time !== "";
  const message = t("message", { date, time, hours, group: group || "-", notes: notes || "-" });

  async function sendZalo() {
    // Zalo links can't carry text, so copy it for the customer to paste.
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      setCopied(false);
    }
    window.open(zaloUrl!, "_blank", "noopener");
  }

  return (
    <form className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }} onSubmit={(e) => e.preventDefault()}>
      <div className="field">
        <label htmlFor="hire-date">{t("date")}</label>
        <input id="hire-date" type="date" min={earliestDate} value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="hire-time">{t("start")}</label>
        <input id="hire-time" type="time" step={1800} value={time} onChange={(e) => setTime(e.target.value)} required />
      </div>
      <div className="field">
        <span className="field-label" id="hire-length">{t("length")}</span>
        <div className="segmented" role="group" aria-labelledby="hire-length">
          {([1, 2] as const).map((h) => (
            <button key={h} type="button" className="segmented-button" aria-pressed={hours === h} onClick={() => setHours(h)}>
              {t("hours", { n: h })}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="hire-group">{t("group")}</label>
        <input id="hire-group" inputMode="numeric" value={group} onChange={(e) => setGroup(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="hire-notes">{t("notes")}</label>
        <textarea id="hire-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {whatsappUrl && (ready ? (
        <a className="btn" href={`${whatsappUrl}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
          {t("sendWhatsapp")}
        </a>
      ) : (
        <button type="button" className="btn" disabled>{t("sendWhatsapp")}</button>
      ))}
      {zaloUrl && (
        <button type="button" className="btn-secondary" disabled={!ready} onClick={sendZalo}>
          {t("sendZalo")}
        </button>
      )}
      <p className="muted" style={{ margin: 0, fontSize: 13 }} role="status">{copied ? t("copied") : t("nothingBooked")}</p>
    </form>
  );
}
