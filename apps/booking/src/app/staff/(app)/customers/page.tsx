import Link from "next/link";
import { staffApi } from "@/lib/data";
import { requireStaff } from "@/lib/staff-guard";

// S4 Customers: search by name, phone or email.
export default async function Customers({ searchParams }: PageProps<"/staff/customers">) {
  const sp = await searchParams;
  const me = await requireStaff();
  const q = typeof sp.q === "string" ? sp.q : "";
  const hits = q.trim().length >= 2 ? await staffApi().searchCustomers(q) : [];
  return (
    <>
      <div className="staff-head">
        <h1 className="heading">customers</h1>
        <Link className="sbtn" href="/staff/customers/new">Add customer</Link>
      </div>
      {sp.sell && <p className="notice">Find the customer, then sell the pack from their page.</p>}
      <form className="staff-actions" role="search">
        <input type="hidden" name="sell" value={typeof sp.sell === "string" ? sp.sell : ""} />
        <div className="field" style={{ flex: 1, minWidth: 240 }}>
          <label htmlFor="q">Name, phone or email</label>
          <input id="q" name="q" defaultValue={q} autoFocus placeholder="e.g. Lan, 0905, lan@" />
        </div>
        <button className="sbtn" type="submit" style={{ alignSelf: "flex-end" }}>Search</button>
      </form>
      {me.role === "instructor" && me.access === "own_sessions" && (
        <p className="muted small" style={{ margin: 0 }}>You can find anyone to book them in; full details show for people booked into your sessions.</p>
      )}
      {q && hits.length === 0 && <p className="muted">No customers found.</p>}
      {hits.length > 0 && (
        <div className="card" style={{ overflowX: "auto" }}>
          <table>
            <thead><tr><th>Name</th><th>Phone</th><th>Email</th></tr></thead>
            <tbody>
              {hits.map((h) => (
                <tr key={h.customerId}>
                  <td><Link href={`/staff/customers/${h.customerId}`}>{h.fullName}</Link>{h.deactivated && <span className="tag tag-warn" style={{ marginLeft: 6 }}>Deactivated</span>}</td>
                  <td>{h.phone}</td>
                  <td>{h.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
