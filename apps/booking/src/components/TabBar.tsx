import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ClassesTabLink } from "./RememberPlace";

export async function TabBar({ current }: { current: "classes" | "bookings" | "packages" }) {
  const t = await getTranslations("tabs");
  const tabs = [
    { key: "classes", href: "/classes" },
    { key: "bookings", href: "/bookings" },
    { key: "packages", href: "/packages" },
  ] as const;
  return (
    <nav className="tabbar" aria-label={t("label")}>
      {tabs.map((tab) => {
        const inner = <><span className="tab-dot" />{t(tab.key)}</>;
        const current_ = current === tab.key ? "page" : undefined;
        // Classes goes back to the week you were looking at (unless you're on it already).
        return tab.key === "classes" && current !== "classes"
          ? <ClassesTabLink key={tab.key} className="tab" aria-current={current_}>{inner}</ClassesTabLink>
          : <Link key={tab.key} className="tab" href={tab.href} aria-current={current_}>{inner}</Link>;
      })}
    </nav>
  );
}
