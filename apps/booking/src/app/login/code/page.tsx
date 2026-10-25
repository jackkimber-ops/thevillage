import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { TopBar } from "@/components/TopBar";
import { CodeForm } from "@/components/forms/CodeForm";
import { safeNext } from "@/lib/safe-next";

// C2 Enter the code.
export default async function CodePage({ searchParams }: PageProps<"/login/code">) {
  const sp = await searchParams;
  const email = typeof sp.email === "string" ? sp.email : "";
  const next = safeNext(sp.next);
  const t = await getTranslations("login");
  const back = `/login?next=${encodeURIComponent(next)}`;
  return (
    <div className="page">
      <TopBar back={back} />
      <main className="page-body" style={{ padding: "20px 22px 24px", gap: 20 }}>
        <div>
          <h1 className="heading" style={{ fontSize: 30, marginBottom: 8 }}>{t("checkEmail")}</h1>
          <p className="muted" style={{ margin: 0, fontSize: 15, lineHeight: 1.45 }}>
            {t.rich("sentTo", { email, strong: (c) => <strong style={{ color: "var(--ink)" }}>{c}</strong> })}
          </p>
        </div>
        <CodeForm email={email} next={next} />
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
          <Link className="btn-secondary" href={back}>{t("newCode")}</Link>
          <Link className="link-center" href={back}>{t("differentEmail")}</Link>
        </div>
      </main>
    </div>
  );
}
