import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TopBar } from "@/components/TopBar";
import { DetailsForm } from "@/components/forms/DetailsForm";
import { account } from "@/lib/data";
import { safeNext } from "@/lib/safe-next";

// C2b Your details: once, after the first login with a new email.
export default async function WelcomePage({ searchParams }: PageProps<"/welcome">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const acc = account();
  const user = await acc.user();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (await acc.me()) redirect(next);
  const t = await getTranslations("details");
  return (
    <div className="page">
      <TopBar />
      <main className="page-body" style={{ padding: "8px 20px 24px" }}>
        <div>
          <h1 className="heading" style={{ fontSize: 28, marginBottom: 6 }}>{t("title")}</h1>
          <p className="muted" style={{ margin: 0, fontSize: 15 }}>{t("intro")}</p>
        </div>
        <DetailsForm email={user.email} next={next} />
      </main>
    </div>
  );
}
