import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LanguageButton } from "./LanguageButton";
import { BackIcon, MenuIcon } from "./Icons";

/** Customer header: logo (or a back button), the language button and the menu. */
export async function TopBar({ back, extra }: { back?: string; extra?: React.ReactNode }) {
  const t = await getTranslations("nav");
  return (
    <header className="topbar">
      {back ? (
        <Link className="back-button" href={back} aria-label={t("back")}>
          <BackIcon />
        </Link>
      ) : (
        <Link href="/" aria-label={t("home")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo" src="/brand/wordmark-full-colour.png" alt="the village." width={73} height={34} />
        </Link>
      )}
      <div className="topbar-actions">
        {extra}
        <LanguageButton />
        <Link className="icon-button" href="/menu" aria-label={t("menu")}>
          <MenuIcon />
        </Link>
      </div>
    </header>
  );
}
