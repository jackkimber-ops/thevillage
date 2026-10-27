"use client";

import { useActionState } from "react";
import { sellPackAction } from "@/lib/actions/staff";
import type { PackType } from "@/lib/data/staff-types";
import { formatVnd } from "@/lib/money";
import { StaffFormError } from "./StaffFormError";
import { keepValues } from "@/lib/keep-values";

export function SellPackForm({ customerId, packs, today }: { customerId: string; packs: PackType[]; today: string }) {
  const [state, action, pending] = useActionState(sellPackAction, undefined);
  const onSale = packs.filter((p) => p.onSale);
  return (
    <form onSubmit={keepValues(action)} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="hidden" name="customerId" value={customerId} />
      <div className="field">
        <label htmlFor="pack">Pack</label>
        <select id="pack" name="packTypeId" required>
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
      <p className="muted small" style={{ margin: 0 }}>The payment is recorded with the sale. Any upcoming pay-on-the-day bookings switch to credits from this pack.</p>
      <StaffFormError code={state?.error} />
      <button className="sbtn" type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>Sell and record payment</button>
    </form>
  );
}
