import { getLocale, getTranslations } from "next-intl/server";
import { TopBar } from "@/components/TopBar";
import { account, data } from "@/lib/data";
import { PrivacyContent } from "@/lib/policies";

// Change #45: the owners' agreed wording (13 Nov), in English and Vietnamese; live values from settings and the catalog.
export default async function Page() {
  const t = await getTranslations("policies");
  const locale = (await getLocale()) === "vi" ? "vi" : "en";
  const [s, packs, prices] = await Promise.all([data().settings(), account().packsOnSale(), data().dropInPrices()]);
  return (
    <div className="page">
      <TopBar back="/menu" backToPrevious />
      <main className="page-body policy">
        <h1 className="heading" style={{ fontSize: 28 }}>{t("privacyTitle")}</h1>
        {PrivacyContent({ locale, s, packs, prices })}
      </main>
    </div>
  );
}
