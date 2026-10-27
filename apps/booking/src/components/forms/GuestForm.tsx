"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { guestBookAction } from "@/lib/actions/booking";
import { ContactChoice } from "./ContactChoice";
import { ErrorText } from "./ErrorText";
import { keepValues } from "@/lib/keep-values";

export function GuestForm({ sessionId, needsChild, cutoffTime }: { sessionId: string; needsChild: boolean; cutoffTime: string }) {
  const t = useTranslations("guest");
  const d = useTranslations("details");
  const [state, action, pending] = useActionState(guestBookAction, undefined);
  const [kids, setKids] = useState(needsChild ? 1 : 0);
  return (
    <form onSubmit={keepValues(action)} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="field"><label htmlFor="g-name">{d("name")}</label><input id="g-name" name="fullName" autoComplete="name" required /></div>
      <div className="field"><label htmlFor="g-phone">{d("mobile")}</label><input id="g-phone" name="phone" type="tel" autoComplete="tel" placeholder="090 123 4567" required /></div>
      <ContactChoice />
      <div className="field"><label htmlFor="g-email">{d("email")}</label><input id="g-email" name="email" type="email" autoComplete="email" placeholder={t("emailHint")} required /></div>
      {Array.from({ length: kids }, (_, i) => (
        <fieldset key={i} className="card child-fields">
          <legend className="field-label">{t("childN", { n: i + 1 })}</legend>
          <div className="field"><label htmlFor={`c${i}n`}>{d("childName")}</label><input id={`c${i}n`} name={`child${i + 1}Name`} required={needsChild && i === 0} /></div>
          <div className="field"><label htmlFor={`c${i}m`}>{d("childBorn")}</label><input id={`c${i}m`} name={`child${i + 1}Month`} type="month" required={needsChild && i === 0} /></div>
        </fieldset>
      ))}
      {kids < 2 && (
        <button type="button" className="card add-row" onClick={() => setKids(kids + 1)}>
          <span className="add-icon" aria-hidden="true">+</span>
          <span><strong>{kids === 0 ? d("addChild") : t("addAnother")}</strong> {kids === 0 && <span className="muted">{d("optional")}</span>}<br /><span className="muted small">{t("childHint")}</span></span>
        </button>
      )}
      <ErrorText code={state?.error} />
      <button className="btn" type="submit" disabled={pending}>{t("submit")}</button>
      <p className="muted small" style={{ margin: 0, lineHeight: 1.45 }}>
        {t.rich("smallPrint", { time: cutoffTime, privacy: (c) => <Link href="/privacy">{c}</Link> })}
      </p>
    </form>
  );
}
