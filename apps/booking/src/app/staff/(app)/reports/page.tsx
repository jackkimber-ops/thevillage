import Link from "next/link";
import { staffApi } from "@/lib/data";
import type { MoneyRow } from "@/lib/data/staff-types";
import { formatVnd } from "@/lib/money";
import { byWeek, FOR_LABEL, METHOD_LABEL, METHODS, monthOf, monthRange, totals, type Totals } from "@/lib/money-report";
import { requireManager } from "@/lib/staff-guard";
import { addMonths, formatDayShort, formatMonth, vnDateKey } from "@/lib/time";

// M3 Money report (managers; brought forward from the +1 month release, 3 Nov): payments by day and
// payment method, with weekly and monthly totals, to check against the bank and the cash box.
export default async function ReportsPage({ searchParams }: PageProps<"/staff/reports">) {
  await requireManager();
  const sp = await searchParams;
  const today = vnDateKey(new Date());
  const month = monthOf(typeof sp.month === "string" ? sp.month : undefined, today);
  const { from, to } = monthRange(month);
  const rows = await staffApi().moneyReport(from, to);
  const month0 = `${month}-01`;
  const prev = addMonths(month0, -1).slice(0, 7);
  const next = addMonths(month0, 1).slice(0, 7);
  const sum = totals(rows);
  const vnd = (n: number) => (n ? formatVnd(n, "en") : "–");
  const forTotals = (Object.keys(FOR_LABEL) as MoneyRow["paidFor"][])
    .map((k) => ({ k, total: rows.filter((r) => r.paidFor === k).reduce((n, r) => n + r.amountVnd, 0) }))
    .filter((x) => x.total > 0);
  const cells = (t: Totals) => (
    <>
      {METHODS.map((m) => <td key={m} className="num">{vnd(t[m])}</td>)}
      <td className="num"><strong>{vnd(t.total)}</strong></td>
    </>
  );
  const time = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  return (
    <>
      <h1 className="heading">reports</h1>
      <div className="row-between">
        <h2 className="heading sec" style={{ margin: 0 }}>money · {formatMonth(month0, "en")}</h2>
        <div className="row">
          <Link className="sbtn2" href={`/staff/reports?month=${prev}`} aria-label="Previous month">‹ {formatMonth(`${prev}-01`, "en")}</Link>
          {next <= today.slice(0, 7) && <Link className="sbtn2" href={`/staff/reports?month=${next}`} aria-label="Next month">{formatMonth(`${next}-01`, "en")} ›</Link>}
          <a className="sbtn2" href={`/staff/reports/export?month=${month}`} download>Download (spreadsheet)</a>
        </div>
      </div>

      <div className="report-tiles">
        <div className="card"><span className="muted small">Total</span><strong>{formatVnd(sum.total, "en")}</strong><span className="muted small">{rows.length} payment{rows.length === 1 ? "" : "s"}</span></div>
        {METHODS.map((m) => <div key={m} className="card"><span className="muted small">{METHOD_LABEL[m]}</span><strong>{formatVnd(sum[m], "en")}</strong></div>)}
      </div>
      {forTotals.length > 0 && (
        <p className="muted" style={{ margin: 0 }}>{forTotals.map((x) => `${FOR_LABEL[x.k]} ${formatVnd(x.total, "en")}`).join(" · ")}</p>
      )}

      {rows.length === 0 ? (
        <p className="muted">No payments recorded in {formatMonth(month0, "en")}.</p>
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="report-table">
            <thead><tr><th>Day</th>{METHODS.map((m) => <th key={m} className="num">{METHOD_LABEL[m]}</th>)}<th className="num">Total</th></tr></thead>
            <tbody>
              {byWeek(rows, from, to).filter((w) => w.days.length > 0).map((w) => [
                ...w.days.map((d) => <tr key={d.day}><td>{formatDayShort(d.day, "en")}</td>{cells(d.totals)}</tr>),
                <tr key={`w${w.from}`} className="report-week"><td>Week {formatDayShort(w.from, "en")} – {formatDayShort(w.to, "en")}</td>{cells(w.totals)}</tr>,
              ])}
            </tbody>
            <tfoot><tr><td>{formatMonth(month0, "en")}</td>{cells(sum)}</tr></tfoot>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 className="heading sec">payments by day</h2>
          {byWeek(rows, from, to).flatMap((w) => w.days).map((d) => (
            <details key={d.day} className="card">
              <summary className="row-between" style={{ cursor: "pointer" }}><strong>{formatDayShort(d.day, "en")}</strong><span>{formatVnd(d.totals.total, "en")} · {d.rows.length}</span></summary>
              <table className="report-table" style={{ marginTop: 8 }}>
                <tbody>
                  {d.rows.map((r) => (
                    <tr key={r.id}>
                      <td>{time(r.recordedAt)}</td>
                      <td>{r.customerName ?? "–"}</td>
                      <td>{FOR_LABEL[r.paidFor]}{r.what ? `: ${r.what}` : ""}{r.note ? <span className="muted"> · {r.note}</span> : null}</td>
                      <td>{METHOD_LABEL[r.method]}</td>
                      <td className="num">{formatVnd(r.amountVnd, "en")}</td>
                      <td className="muted small">{r.recordedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          ))}
        </section>
      )}
    </>
  );
}
