import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function TabBar({ current }: { current: "classes" | "bookings" | "packages" }) {
  const t = await getTranslations("tabs");
  const tabs = [
    { key: "classes", href: "/classes" },
    { key: "bookings", href: "/bookings" },
    { key: "packages", href: "/packages" },
  ] as const;
  return (
    <nav className="tabbar" aria-label={t("label")}>
      {tabs.map((tab) => (
        <Link key={tab.key} className="tab" href={tab.href} aria-current={current === tab.key ? "page" : undefined}>
          <span className="tab-dot" />
          {t(tab.key)}
        </Link>
      ))}
    </nav>
  );
}
