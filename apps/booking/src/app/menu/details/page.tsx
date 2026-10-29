import { getTranslations } from "next-intl/server";
import { TopBar } from "@/components/TopBar";
import { DetailsForm } from "@/components/forms/DetailsForm";
import { account } from "@/lib/data";
import { requireCustomer } from "@/lib/guard";

// C19 (brought forward, 29 Oct): change your own name, phone and way to reach you. Email is the login, so staff change it.
// The language saved is the one the site is in (switch it in the menu first).
export default async function MyDetailsPage() {
  const me = await requireCustomer("/menu/details");
  const user = await account().user();
  const t = await getTranslations("details");
  return (
    <div className="page">
      <TopBar back="/menu" />
      <main className="page-body" style={{ padding: "8px 20px 24px" }}>
        <div>
          <h1 className="heading" style={{ fontSize: 28, marginBottom: 6 }}>{t("editTitle")}</h1>
          <p className="muted" style={{ margin: 0, fontSize: 15 }}>{t("editIntro")}</p>
        </div>
        <DetailsForm email={user?.email ?? me.email ?? ""} next="/menu?saved=1" initial={{ fullName: me.fullName, phone: me.phone, preferredContact: me.preferredContact }} />
      </main>
    </div>
  );
}
