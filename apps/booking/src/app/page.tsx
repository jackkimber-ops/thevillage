import { useTranslations } from "next-intl";
import { LanguageButton } from "@/components/LanguageButton";

// Placeholder home page for stage 3 (foundations). The real C0 Home comes in stage 6.
export default function Home() {
  const t = useTranslations("home");
  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <LanguageButton />
      </div>
      <h1 className="heading" style={{ fontSize: 30, marginTop: 40 }}>{t("title")}</h1>
      <p>{t("subtitle")}</p>
      <p style={{ color: "var(--muted)" }}>{t("comingSoon")}</p>
    </main>
  );
}
