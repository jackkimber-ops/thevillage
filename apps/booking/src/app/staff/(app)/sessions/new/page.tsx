import Link from "next/link";
import { SessionForm } from "@/components/staff/SessionForm";
import { staffApi } from "@/lib/data";
import { requireStaff } from "@/lib/staff-guard";
import { isDateKey, vnDateKey } from "@/lib/time";

// S3 New session (managers: any; instructors: their own classes).
export default async function NewSession({ searchParams }: PageProps<"/staff/sessions/new">) {
  const sp = await searchParams;
  const me = await requireStaff();
  const api = staffApi();
  const [types, instructors] = await Promise.all([api.sessionTypes(), api.instructors()]);
  const allowed = me.role === "manager" ? types : types.filter((t) => t.kind === "class");
  const first = allowed.find((t) => t.active)!;
  return (
    <>
      <Link href="/staff/calendar" className="small-link">← Calendar</Link>
      <h1 className="heading">new session</h1>
      <SessionForm
        types={allowed}
        instructors={instructors}
        lockInstructor={me.role === "manager" ? null : me.userId}
        initial={{
          sessionTypeId: first.id, title: first.name, date: isDateKey(sp.date) ? sp.date : vnDateKey(new Date()), time: "09:00",
          minutes: first.defaultMinutes, capacity: first.defaultCapacity, instructorId: me.role === "manager" ? null : me.userId, notes: null,
        }}
      />
    </>
  );
}
