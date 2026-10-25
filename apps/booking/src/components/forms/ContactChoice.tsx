"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/** "Best way to reach you": WhatsApp, Zalo or a call. */
export function ContactChoice({ initial = "whatsapp" }: { initial?: "whatsapp" | "zalo" | "call" }) {
  const t = useTranslations("details");
  const [value, setValue] = useState(initial);
  return (
    <div className="field">
      <span className="field-label" id="contact-label">{t("reachYou")}</span>
      <input type="hidden" name="contact" value={value} />
      <div className="segmented" role="group" aria-labelledby="contact-label">
        {(["whatsapp", "zalo", "call"] as const).map((c) => (
          <button key={c} type="button" className="segmented-button" aria-pressed={value === c} onClick={() => setValue(c)}>
            {t(`contact.${c}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
