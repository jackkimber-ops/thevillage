import { ClosureForm } from "@/components/staff/ClosureForm";
import { Notice } from "@/components/staff/Notice";
import { SettingsForm } from "@/components/staff/SettingsForm";
import { removeClosureAction } from "@/lib/actions/staff";
import { staffApi } from "@/lib/data";
import { requireManager } from "@/lib/staff-guard";
import { formatDayShort, vnDateKey } from "@/lib/time";

// M9 Studio settings and M1 closures (managers; brought forward from the +1 month release, 3 Nov).
export default async function SettingsPage({ searchParams }: PageProps<"/staff/settings">) {
  await requireManager();
  const sp = await searchParams;
  const api = staffApi();
  const [s, closures] = await Promise.all([api.editableSettings(), api.closures()]);
  const today = vnDateKey(new Date());
  const days = (a: string, b: string) => (a === b ? formatDayShort(a, "en") : `${formatDayShort(a, "en")} – ${formatDayShort(b, "en")}`);
  return (
    <>
      <h1 className="heading">settings</h1>
      <p className="muted" style={{ margin: 0 }}>The studio&apos;s details and booking rules, used on the booking site, the website and in emails. Every change is recorded.</p>
      <SettingsForm s={s} />

      <section id="closures" style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
        <h2 className="heading sec">closures</h2>
        <p className="muted" style={{ margin: 0 }}>Days the studio is closed, such as Tết or a public holiday.</p>
        <Notice error={sp.error} />
        <div className="grid-2">
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {closures.length === 0 && <p className="muted" style={{ margin: 0 }}>No closures coming up.</p>}
            {closures.map((c) => (
              <div key={c.id} className="row-between">
                <span><strong>{days(c.startsOn, c.endsOn)}</strong> · {c.reason}</span>
                <form action={removeClosureAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="link-button" type="submit">Reopen</button>
                </form>
              </div>
            ))}
            {closures.length > 0 && <p className="muted small" style={{ margin: 0 }}>Reopening lets sessions go on those days again. Cancelled sessions stay cancelled.</p>}
          </div>
          <ClosureForm today={today} />
        </div>
      </section>
    </>
  );
}
