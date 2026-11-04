"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { guestBookAction } from "@/lib/actions/booking";
import { ContactChoice } from "./ContactChoice";
import { ErrorText } from "./ErrorText";
import { keepValues } from "@/lib/keep-values";
import { clearDraft, contactOf, useDraft, useDraftForm, type Draft } from "@/lib/draft";
import { thisMonthVn } from "@/lib/time";

type Props = { sessionId: string; needsChild: boolean; cutoffTime: string };

// One draft for every class, so name, phone and children carry over if they look at another session.
const DRAFT = "guest";

export function GuestForm(props: Props) {
  const draft = useDraft(DRAFT);
  return <GuestFormFields key={draft ? "draft" : "new"} draft={draft} {...props} />;
}

function GuestFormFields({ sessionId, needsChild, cutoffTime, draft }: Props & { draft: Draft | null }) {
  const t = useTranslations("guest");
  const d = useTranslations("details");
  const [state, action, pending] = useActionState(guestBookAction, undefined);
  const saved = draft ? [1, 2].filter((n) => `child${n}Name` in draft).length : 0;
  // Each child row has its own id, so removing child 1 keeps what was typed for child 2.
  const [rows, setRows] = useState(() => Array.from({ length: Math.max(saved, needsChild ? 1 : 0) }, (_, i) => i));
  const nextRow = useRef(rows.length);
  const form = useDraftForm(DRAFT, draft);
  const submit = keepValues(action);
  return (
    <form {...form} onSubmit={(e) => { clearDraft(DRAFT); submit(e); }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="field"><label htmlFor="g-name">{d("name")}</label><input id="g-name" name="fullName" autoComplete="name" required /></div>
      <div className="field"><label htmlFor="g-phone">{d("mobile")}</label><input id="g-phone" name="phone" type="tel" autoComplete="tel" placeholder="090 123 4567" required /></div>
      <ContactChoice initial={contactOf(draft)} />
      <div className="field"><label htmlFor="g-email">{d("email")}</label><input id="g-email" name="email" type="email" autoComplete="email" placeholder={t("emailHint")} required /></div>
      {rows.map((row, i) => (
        <fieldset key={row} className="card child-fields">
          <legend className="field-label">{t("childN", { n: i + 1 })}</legend>
          {!(needsChild && rows.length === 1) && (
            <button type="button" className="link-button child-remove" aria-label={t("removeChildN", { n: i + 1 })} onClick={() => setRows(rows.filter((r) => r !== row))}>
              {d("removeChild")}
            </button>
          )}
          <div className="field"><label htmlFor={`c${row}n`}>{d("childName")}</label><input id={`c${row}n`} name={`child${i + 1}Name`} required={needsChild && i === 0} /></div>
          <div className="field"><label htmlFor={`c${row}m`}>{d("childBorn")}</label><input id={`c${row}m`} name={`child${i + 1}Month`} type="month" max={thisMonthVn()} required={needsChild && i === 0} /></div>
        </fieldset>
      ))}
      {rows.length < 2 && (
        <button type="button" className="card add-row" onClick={() => setRows([...rows, nextRow.current++])}>
          <span className="add-icon" aria-hidden="true">+</span>
          <span><strong>{rows.length === 0 ? d("addChild") : t("addAnother")}</strong> {rows.length === 0 && <span className="muted">{d("optional")}</span>}<br /><span className="muted small">{t("childHint")}</span></span>
        </button>
      )}
      <ErrorText code={state?.error} />
      <button className="btn" type="submit" disabled={pending}>{t("submit")}</button>
      <p className="muted small" style={{ margin: 0, lineHeight: 1.45 }}>
        {t.rich("smallPrint", { time: cutoffTime, privacy: (c) => <Link href="/privacy">{c}</Link>, terms: (c) => <Link href="/terms">{c}</Link> })}
      </p>
    </form>
  );
}
