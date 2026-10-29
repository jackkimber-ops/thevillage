import Link from "next/link";
import { staffApi } from "@/lib/data";
import { requireStaff } from "@/lib/staff-guard";

const PAGE = 50;

// S4 Customers: everyone A–Z with their credits left (team feedback 27 Oct), or search by name, phone or email.
export default async function Customers({ searchParams }: PageProps<"/staff/customers">) {
  const sp = await searchParams;
  const me = await requireStaff();
  const q = typeof sp.q === "string" ? sp.q : "";
  const searching = q.trim().length >= 2;
  const hits = searching ? await staffApi().searchCustomers(q) : [];
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : "1") || 1);
  const list = searching ? null : await staffApi().listCustomers(PAGE, (page - 1) * PAGE);
  const pages = list ? Math.max(1, Math.ceil(list.total / PAGE)) : 1;
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
          <input id="q" name="q" defaultValue={q} placeholder="e.g. Lan, 0905, lan@" />
        </div>
        <button className="sbtn" type="submit" style={{ alignSelf: "flex-end" }}>Search</button>
      </form>
      {me.role === "instructor" && me.access === "own_sessions" && (
        <p className="muted small" style={{ margin: 0 }}>You can find anyone to book them in; full details show for people booked into your sessions.</p>
      )}
      {q && hits.length === 0 && <p className="muted">No customers found.</p>}
      {list && (
        <div className="card" style={{ overflowX: "auto" }}>
          <div className="muted small" style={{ marginBottom: 8 }}>{list.total} customer{list.total === 1 ? "" : "s"}, A–Z · credits left on packs that haven&apos;t ended</div>
          {list.rows.length === 0 ? <p className="muted" style={{ margin: 0 }}>No customers yet.</p> : (
            <table>
              <thead><tr><th>Name</th><th>Phone</th><th style={{ textAlign: "right" }}>Credits left</th></tr></thead>
              <tbody>
                {list.rows.map((r) => (
                  <tr key={r.customerId}>
                    <td><Link href={`/staff/customers/${r.customerId}`}>{r.fullName}</Link>{r.deactivated && <span className="tag tag-warn" style={{ marginLeft: 6 }}>Deactivated</span>}</td>
                    <td>{r.phone}</td>
                    <td style={{ textAlign: "right" }}>{r.creditsLeft || "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {pages > 1 && (
            <div className="staff-actions" style={{ marginTop: 10 }}>
              {page > 1 && <Link className="sbtn2 sbtn-sm" href={`/staff/customers?page=${page - 1}`}>← Previous</Link>}
              <span className="muted small">Page {page} of {pages}</span>
              {page < pages && <Link className="sbtn2 sbtn-sm" href={`/staff/customers?page=${page + 1}`}>Next →</Link>}
            </div>
          )}
        </div>
      )}
      {hits.length > 0 && (
        <div className="card" style={{ overflowX: "auto" }}>
          <table>
            <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th style={{ textAlign: "right" }}>Credits left</th></tr></thead>
            <tbody>
              {hits.map((h) => (
                <tr key={h.customerId}>
                  <td><Link href={`/staff/customers/${h.customerId}`}>{h.fullName}</Link>{h.deactivated && <span className="tag tag-warn" style={{ marginLeft: 6 }}>Deactivated</span>}</td>
                  <td>{h.phone}</td>
                  <td>{h.email}</td>
                  <td style={{ textAlign: "right" }}>{h.creditsLeft || "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
