import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ErrorNote } from "@/components/ErrorNote";
import { account } from "@/lib/data";
import { cancelAction } from "@/lib/actions/booking";
import { requireCustomer } from "@/lib/guard";
import { formatDayLong, formatTime, vnDateKey } from "@/lib/time";

// C11 Cancel a booking (before the cutoff; after it, the app shows Message us instead).
export default async function CancelPage({ params, searchParams }: PageProps<"/bookings/[id]/cancel">) {
  const { id } = await params;
  const sp = await searchParams;
  await requireCustomer(`/bookings/${id}/cancel`);
  const t = await getTranslations("cancel");
  const locale = await getLocale();
  const b = (await account().myBookings()).find((x) => x.id === id);
  if (!b) notFound();
  return (
    <div className="page sheet-backdrop">
      <div role="dialog" aria-labelledby="cancel-title" className="sheet">
        <div className="sheet-handle" />
        <h1 id="cancel-title" className="heading" style={{ fontSize: 26 }}>{t("title")}</h1>
        <div className="card">
          <div style={{ fontWeight: 600 }}>{b.session.title}</div>
          <div className="muted">{formatDayLong(vnDateKey(b.session.startsAt), locale)} · {formatTime(b.session.startsAt, locale)}</div>
        </div>
        <p style={{ margin: 0 }}>{b.credits > 0 ? t("creditBack", { n: b.credits, pack: b.packName ?? "" }) : t("nothingToPay")}</p>
        {typeof sp.error === "string" && <ErrorNote code={sp.error} />}
        <form action={cancelAction}>
          <input type="hidden" name="bookingId" value={b.id} />
          <button className="btn-danger" type="submit">{t("yes")}</button>
        </form>
        <Link className="btn-secondary" href="/bookings">{t("keep")}</Link>
      </div>
    </div>
  );
}
