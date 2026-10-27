"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { saveDetailsAction } from "@/lib/actions/auth";
import { ErrorText } from "./ErrorText";
import { ContactChoice } from "./ContactChoice";
import { keepValues } from "@/lib/keep-values";

export function DetailsForm({ email, next }: { email: string; next: string }) {
  const t = useTranslations("details");
  const [state, action, pending] = useActionState(saveDetailsAction, undefined);
  const [addChild, setAddChild] = useState(false);
  return (
    <form onSubmit={keepValues(action)} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="hidden" name="next" value={next} />
      <div className="field"><label htmlFor="fullName">{t("name")}</label><input id="fullName" name="fullName" autoComplete="name" required /></div>
      <div className="field"><label htmlFor="phone">{t("mobile")}</label><input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="090 123 4567" required /></div>
      <ContactChoice />
      <div className="field"><label htmlFor="em">{t("email")}</label><input id="em" value={email} readOnly className="readonly" /></div>
      {addChild ? (
        <fieldset className="card child-fields">
          <legend className="field-label">{t("child")}</legend>
          <div className="field"><label htmlFor="childName">{t("childName")}</label><input id="childName" name="childName" /></div>
          <div className="field"><label htmlFor="childMonth">{t("childBorn")}</label><input id="childMonth" name="childMonth" type="month" /></div>
        </fieldset>
      ) : (
        <button type="button" className="card add-row" onClick={() => setAddChild(true)}>
          <span className="add-icon" aria-hidden="true">+</span>
          <span><strong>{t("addChild")}</strong> <span className="muted">{t("optional")}</span><br /><span className="muted small">{t("addChildHint")}</span></span>
        </button>
      )}
      <ErrorText code={state?.error} />
      <button className="btn" type="submit" disabled={pending}>{t("save")}</button>
      <p className="muted small" style={{ textAlign: "center", margin: 0 }}>{t("changeLater")}</p>
    </form>
  );
}
