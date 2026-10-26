import { getTranslations } from "next-intl/server";
import { TopBar } from "@/components/TopBar";

// The owners are writing this policy (EN and VI). Placeholder until then.
export default async function Page() {
  const t = await getTranslations("policies");
  return (
    <div className="page">
      <TopBar back="/menu" />
      <main className="page-body">
        <h1 className="heading" style={{ fontSize: 28 }}>{t("privacyTitle")}</h1>
        <p><span className="tag tag-todo">[PLACEHOLDER: {t("comingSoon")}]</span></p>
      </main>
    </div>
  );
}
