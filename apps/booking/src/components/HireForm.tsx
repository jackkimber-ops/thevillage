"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useDraft, useDraftForm, type Draft } from "@/lib/draft";

type Props = { whatsappUrl: string | null; zaloUrl: string | null; earliestDate: string; maxGroup: number };

const DRAFT = "hire";

export function HireForm(props: Props) {
  const draft = useDraft(DRAFT);
  return <HireFormFields key={draft ? "draft" : "new"} draft={draft} {...props} />;
}

// Team feedback (2 Nov): hire can be anything from an hour to a full day, agreed case by case on chat,
// so the customer says when and for how long in their own words (no time or length pickers).
function HireFormFields({ whatsappUrl, zaloUrl, earliestDate, maxGroup, draft }: Props & { draft: Draft | null }) {
  const t = useTranslations("hire");
  const [date, setDate] = useState(draft?.date ?? "");
  const [when, setWhen] = useState(draft?.when ?? "");
  const [group, setGroup] = useState(draft?.group ?? "");
  const [notes, setNotes] = useState(draft?.notes ?? "");
  const [copied, setCopied] = useState(false);
  const form = useDraftForm(DRAFT, null);

  const ready = date !== "" && when.trim() !== "";
  const tooMany = Number(group) > maxGroup;
  const message = t("message", { date, when: when.trim(), group: group || "-", notes: notes || "-" });

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
    <form {...form} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }} onSubmit={(e) => e.preventDefault()}>
      <div className="field">
        <label htmlFor="hire-date">{t("date")}</label>
        <input id="hire-date" name="date" type="date" min={earliestDate} value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="hire-when">{t("when")}</label>
        <input id="hire-when" name="when" placeholder={t("whenHint")} value={when} onChange={(e) => setWhen(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="hire-group">{t("group")}</label>
        <input id="hire-group" name="group" inputMode="numeric" aria-describedby="hire-group-max" value={group} onChange={(e) => setGroup(e.target.value)} />
        <span id="hire-group-max" className={tooMany ? "error-text small" : "muted small"}>{t(tooMany ? "tooMany" : "maxGroup", { n: maxGroup })}</span>
      </div>
      <div className="field">
        <label htmlFor="hire-notes">{t("notes")}</label>
        <textarea id="hire-notes" name="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
