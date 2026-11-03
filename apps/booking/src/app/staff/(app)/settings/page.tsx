import { SettingsForm } from "@/components/staff/SettingsForm";
import { staffApi } from "@/lib/data";
import { requireManager } from "@/lib/staff-guard";

// M9 Studio settings (managers; brought forward from the +1 month release, 3 Nov).
export default async function SettingsPage() {
  await requireManager();
  const s = await staffApi().editableSettings();
  return (
    <>
      <h1 className="heading">settings</h1>
      <p className="muted" style={{ margin: 0 }}>The studio&apos;s details and booking rules, used on the booking site, the website and in emails. Every change is recorded.</p>
      <SettingsForm s={s} />
    </>
  );
}
