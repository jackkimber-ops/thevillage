"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { addChildAction, bookAction } from "@/lib/actions/booking";
import { formatVnd } from "@/lib/money";
import { ErrorText } from "./ErrorText";

type Props = {
  sessionId: string;
  kind: "class" | "open_play" | "private_hire" | "workshop";
  me: { name: string; children: Array<{ id: string; name: string; birthMonth: string }> };
  packs: Array<{ name: string; remaining: number; lastDay: string }>;
  dropIn: string | null;
  dropInVnd: number | null;
  cutoffText: string;
  afterCutoff: boolean;
  back: string;
};

function age(birthMonth: string, t: ReturnType<typeof useTranslations>) {
  const b = new Date(`${birthMonth}T00:00:00Z`);
  const now = new Date();
  const months = (now.getUTCFullYear() - b.getUTCFullYear()) * 12 + now.getUTCMonth() - b.getUTCMonth();
  return months < 24 ? t("ageMonths", { n: Math.max(months, 0) }) : t("ageYears", { n: Math.floor(months / 12) });
}

export function BookForm(p: Props) {
  const t = useTranslations("book");
  const locale = useLocale();
  const [state, action, pending] = useActionState(bookAction, undefined);
  const [childState, childAction, childPending] = useActionState(addChildAction, undefined);
  const [chosen, setChosen] = useState<string[]>(p.me.children.slice(0, p.kind === "open_play" ? 1 : 0).map((c) => c.id));
  const [adding, setAdding] = useState(p.me.children.length === 0 && p.kind === "open_play");

  const openPlay = p.kind === "open_play";
  const needed = openPlay ? chosen.length : p.kind === "workshop" ? 0 : 1;
  const pack = needed > 0 ? p.packs.find((k) => k.remaining >= needed) : undefined;
  const toggle = (id: string) =>
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 2 ? c : [...c, id]));

  return (
    <main className="page-body" style={{ paddingTop: 14 }}>
      <form id="book" action={action} />
      <input form="book" type="hidden" name="sessionId" value={p.sessionId} />
      <div className="card" style={{ padding: "10px 16px" }}>
        <p className="label">{t("whosComing")}</p>
        <label className="check"><input type="checkbox" checked disabled />{t("you", { name: p.me.name })}</label>
        {openPlay && (
          <label className="check"><input form="book" type="checkbox" name="secondParent" />{t("secondParent")}</label>
        )}
        {p.me.children.map((c) => (
          <label key={c.id} className="check">
            <input form="book" type="checkbox" name="child" value={c.id} checked={chosen.includes(c.id)} onChange={() => toggle(c.id)}
              disabled={!chosen.includes(c.id) && chosen.length >= 2} />
            {c.name} · {age(c.birthMonth, t)}
          </label>
        ))}
        {adding ? (
          <form action={childAction} className="add-child">
            <input type="hidden" name="back" value={p.back} />
            <strong>{t("addChild")}</strong>
            <div className="field"><label htmlFor="childName">{t("childName")}</label><input id="childName" name="childName" placeholder={t("childNameExample")} /></div>
            <div className="field"><label htmlFor="childMonth">{t("childBorn")}</label><input id="childMonth" name="childMonth" type="month" /></div>
            <ErrorText code={childState?.error} />
            <div className="two-buttons">
              <button type="button" className="btn-secondary" onClick={() => setAdding(false)}>{t("cancel")}</button>
              <button type="submit" className="btn" disabled={childPending}>{t("addChildButton")}</button>
            </div>
            <span className="muted small">{t("savedForNextTime")}</span>
          </form>
        ) : (
          <div className="row-between small muted">
            <span>{openPlay ? t("openPlayRule") : t("classRule")}</span>
            <button type="button" className="link-button" onClick={() => setAdding(true)}>{t("addChildLink")}</button>
          </div>
        )}
      </div>

      {needed > 0 && pack ? (
        <div className="card credit-box">
          <div className="credit-number">{needed}</div>
          <div>
            <div style={{ fontWeight: 600 }}>{t("creditsFrom", { n: needed, pack: pack.name })}</div>
            <div className="muted small">{t("creditsAfter", { now: pack.remaining, after: pack.remaining - needed, day: pack.lastDay })}</div>
          </div>
        </div>
      ) : p.dropInVnd !== null && (needed > 0 || p.kind === "workshop") ? (
        <div className="card pay-box">
          <span className="tag tag-pay">{t("payOnTheDay")}</span>
          <strong>{formatVnd(p.dropInVnd * Math.max(openPlay ? chosen.length : 1, 1), locale)}</strong>
          <span className="muted small">{t("payHow")}</span>
        </div>
      ) : null}

      {p.afterCutoff ? (
        <div className="warn-box"><strong>{t("cantCancel")}</strong> {t("messageIfChange")}</div>
      ) : (
        <p className="muted small" style={{ margin: 0 }}>{p.cutoffText}</p>
      )}

      <ErrorText code={state?.error} />
      <button form="book" type="submit" className="btn" style={{ marginTop: "auto" }} disabled={pending || (openPlay && chosen.length === 0)}>
        {t("confirm")}
      </button>
    </main>
  );
}
