"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { verifyCodeAction } from "@/lib/actions/auth";
import { ErrorText } from "./ErrorText";
import { keepValues } from "@/lib/keep-values";

export function CodeForm({ email, next }: { email: string; next: string }) {
  const t = useTranslations("login");
  const [state, action, pending] = useActionState(verifyCodeAction, undefined);
  return (
    <form onSubmit={keepValues(action)} className="card" style={{ display: "flex", flexDirection: "column", gap: 14, padding: 18 }}>
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />
      <label htmlFor="code" className="label" style={{ margin: 0 }}>{t("yourCode")}</label>
      <input
        id="code"
        name="code"
        className="code-input"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        placeholder="••••••"
        required
        autoFocus
      />
      <ErrorText code={state?.error} />
      <button className="btn" type="submit" disabled={pending}>{t("logIn")}</button>
    </form>
  );
}
