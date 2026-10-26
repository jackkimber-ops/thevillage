import { getTranslations } from "next-intl/server";
import { TopBar } from "@/components/TopBar";
import { HireForm } from "@/components/HireForm";
import { data } from "@/lib/data";
import { addDays, vnDateKey } from "@/lib/time";

// C13 Hire the studio: fill in the details, then send them by WhatsApp or Zalo. Nothing is booked until staff confirm.
export default async function HirePage() {
  const t = await getTranslations("hire");
  const s = await data().settings();
  return (
    <div className="page">
      <div className="session-hero kind-class" style={{ height: 170 }}>
        <TopBar back="/menu" />
      </div>
      <main className="page-body">
        <h1 className="heading" style={{ fontSize: 28 }}>{t("title")}</h1>
        <p style={{ margin: 0, lineHeight: 1.5 }}>{t("intro")}</p>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>{s.openingHours}</p>
        <HireForm whatsappUrl={s.whatsappUrl} zaloUrl={s.zaloUrl} earliestDate={addDays(vnDateKey(new Date()), 1)} />
      </main>
    </div>
  );
}
