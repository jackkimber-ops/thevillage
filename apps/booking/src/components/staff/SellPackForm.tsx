"use client";

import { useActionState, useState } from "react";
import { sellPackAction } from "@/lib/actions/staff";
import type { PackType, PaidDropIn } from "@/lib/data/staff-types";
import { formatVnd } from "@/lib/money";
import { StaffFormError } from "./StaffFormError";
import { keepValues } from "@/lib/keep-values";

export function SellPackForm({ customerId, packs, today, paidToday = [] }: { customerId: string; packs: PackType[]; today: string; paidToday?: PaidDropIn[] }) {
  const [state, action, pending] = useActionState(sellPackAction, undefined);
  const onSale = packs.filter((p) => p.onSale);
  const [packId, setPackId] = useState("");
  const [count, setCount] = useState(true);
  const pack = onSale.find((p) => p.id === packId);
  // Change #40: a drop-in paid today can count in the pack, its price taken off (same day only).
  const covered = pack ? paidToday.filter((x) => pack.coversSessionTypeIds.includes(x.sessionTypeId)).slice(0, pack.credits) : [];
  const less = covered.reduce((n, x) => n + x.amountVnd, 0);
  const what = (xs: PaidDropIn[]) => xs.map((x) => `${x.title} (${formatVnd(x.amountVnd, "en")})`).join(", ");
  return (
    <form onSubmit={keepValues(action)} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="hidden" name="customerId" value={customerId} />
      <div className="field">
        <label htmlFor="pack">Pack</label>
        <select id="pack" name="packTypeId" required value={packId} onChange={(e) => setPackId(e.target.value)}>
          <option value="" disabled>Choose a pack…</option>
          {onSale.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {formatVnd(p.priceVnd, "en")} · {p.validityMonths ? `${p.validityMonths} months` : `${p.validityDays} days`}
            </option>
          ))}
        </select>
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="method">Paid by</label>
          <select id="method" name="method"><option value="qr">QR</option><option value="transfer">Transfer</option><option value="cash">Cash</option></select>
        </div>
        <div className="field"><label htmlFor="from">Valid from</label><input id="from" name="validFrom" type="date" defaultValue={today} /></div>
      </div>
      {paidToday.length > 0 && !pack && (
        <p className="small" style={{ margin: 0 }}>Paid today for a drop-in: {what(paidToday)}. Choose a pack to count it in.</p>
      )}
      {covered.length > 0 && pack && (
        <div className="card" style={{ padding: "10px 14px", background: "var(--linen)" }}>
          <label className="check" style={{ minHeight: 32 }}>
            <input type="checkbox" name="countPaidDropIns" checked={count} onChange={(e) => setCount(e.target.checked)} />
            Count today&apos;s {what(covered)} in this pack
          </label>
          <p className="small" style={{ margin: "4px 0 0" }}>
            {count
              ? <>Take <strong>{formatVnd(Math.max(pack.priceVnd - less, 0), "en")}</strong> now ({formatVnd(pack.priceVnd, "en")} less {formatVnd(less, "en")} already paid). Today&apos;s class uses 1 credit.</>
              : <>Take the full <strong>{formatVnd(pack.priceVnd, "en")}</strong>; today&apos;s class stays a paid drop-in.</>}
          </p>
        </div>
      )}
      <p className="muted small" style={{ margin: 0 }}>The payment is recorded with the sale. Pay-on-the-day bookings switch to credits from this pack: upcoming ones, and today&apos;s even after the class.</p>
      <StaffFormError code={state?.error} />
      <button className="sbtn" type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>Sell and record payment</button>
    </form>
  );
}
