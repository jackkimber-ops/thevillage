import Link from "next/link";
import { BookSomeoneForm } from "@/components/staff/BookSomeoneForm";
import { staffApi } from "@/lib/data";
import { requireStaff } from "@/lib/staff-guard";
import { sessionLine } from "@/lib/staff-format";
import { addDays, formatDayShort, formatTime, nowMs, vnDateKey, vnDayStart } from "@/lib/time";

// S13 Book someone in: the most common way bookings will be made by staff.
export default async function BookSomeone({ searchParams }: PageProps<"/staff/book">) {
  const sp = await searchParams;
  const me = await requireStaff();
  const api = staffApi();
  const today = vnDateKey(new Date());
  const sessions = (await api.timetable(new Date(nowMs() - 3 * 3600000), vnDayStart(addDays(today, 45))))
    .filter((s) => s.kind !== "private_hire" && s.status === "scheduled");
  const customerId = typeof sp.customer === "string" ? sp.customer : null;
  // Opened from a session that can't be booked any more (finished or cancelled): say why it isn't in the list.
  const wanted = typeof sp.session === "string" ? sp.session : null;
  const unavailable = wanted && !sessions.some((x) => x.id === wanted) ? await api.session(wanted) : null;
  const customer = customerId ? await api.customer(customerId) : null;
  const sessionId = typeof sp.session === "string" ? sp.session : null;
  // Back to where they came from: the customer, else that session's check-in list, else the dashboard.
  const back = typeof sp.back === "string" && sp.back.startsWith("/staff") ? sp.back
    : customer ? `/staff/customers/${customer.customerId}`
    : sessionId ? `/staff/sessions/${sessionId}/check-in` : "/staff";
  return (
    <>
      <Link href={back} className="small-link">← Back</Link>
      <h1 className="heading">book someone in</h1>
      {unavailable && (
        <p className="notice notice-error" role="alert">
          {unavailable.title} on {formatDayShort(vnDateKey(unavailable.startsAt), "en")} {unavailable.status === "cancelled" ? "was cancelled" : "has already finished"}, so nobody can be booked into it. Choose another session.
        </p>
      )}
      <BookSomeoneForm
        sessions={sessions.map((s) => ({ id: s.id, kind: s.kind, label: `${formatDayShort(vnDateKey(s.startsAt), "en")} ${formatTime(s.startsAt, "en")} · ${s.title} · ${sessionLine(s)}` }))}
        sessionId={typeof sp.session === "string" ? sp.session : null}
        customer={customer ? { id: customer.customerId, name: customer.fullName } : null}
        isManager={me.role === "manager"}
        trial={sp.trial === "1"}
        back={back}
      />
    </>
  );
}
