import { AddStaffForm, StaffRowForm } from "@/components/staff/StaffForms";
import { staffApi } from "@/lib/data";
import { requireManager } from "@/lib/staff-guard";

// S2 Staff, at /staff/team (/staff/staff would clash with the staff site's address rules) (managers; brought forward from the +1 month release, 3 Nov): who can log in to the staff app.
export default async function StaffPage() {
  const me = await requireManager();
  const people = await staffApi().staffList();
  return (
    <>
      <h1 className="heading">staff</h1>
      <p className="muted" style={{ margin: 0 }}>
        Managers can do everything. Instructors see their own sessions and the people booked into them, or all customers if you choose.
        Switching someone off keeps their name on past sessions.
      </p>
      <div className="grid-2">
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 className="heading sec">team</h2>
          {people.map((p) => <StaffRowForm key={p.userId} person={p} isMe={p.userId === me.userId} />)}
        </section>
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 className="heading sec">add someone</h2>
          <AddStaffForm />
        </section>
      </div>
    </>
  );
}
