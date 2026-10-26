"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { sendCodeAction } from "@/lib/actions/auth";
import { ErrorText } from "./ErrorText";

export function LoginForm({ next }: { next: string }) {
  const t = useTranslations("login");
  const [state, action, pending] = useActionState(sendCodeAction, undefined);
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="email">{t("email")}</label>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" required />
      </div>
      <ErrorText code={state?.error} />
      <button className="btn" type="submit" disabled={pending}>{t("sendCode")}</button>
    </form>
  );
}
