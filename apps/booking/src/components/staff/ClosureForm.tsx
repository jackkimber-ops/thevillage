"use client";

import { useActionState } from "react";
import { addClosureAction } from "@/lib/actions/staff";
import { StaffFormError } from "./StaffFormError";
import { keepValues } from "@/lib/keep-values";

// M1: close the studio for a day or a few. Everything on those days is cancelled for everyone, so ask first.
export function ClosureForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(addClosureAction, undefined);
  const submit = keepValues(action);
  return (
    <form
      onSubmit={(e) => {
        if (!window.confirm("Close the studio on these days? Every session on them is cancelled and everyone booked gets an email.")) {
          e.preventDefault();
          return;
        }
        submit(e);
      }}
      className="card"
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      <div className="form-grid">
        <div className="field"><label>From<input name="startsOn" type="date" min={today} required /></label></div>
        <div className="field"><label>To (same day for one day)<input name="endsOn" type="date" min={today} /></label></div>
        <div className="field" style={{ gridColumn: "1 / -1" }}><label>Reason (customers see it)<input name="reason" placeholder="e.g. Tết" required /></label></div>
      </div>
      <label className="check" style={{ minHeight: 32 }}><input type="checkbox" name="extendPacks" defaultChecked />Add the closed days to everyone&apos;s packs</label>
      <p className="muted small" style={{ margin: 0 }}>Sessions on these days are cancelled for everyone: credits go back and everyone booked gets an email. Nothing new can be put on these days.</p>
      <StaffFormError code={state?.error} />
      {state?.ok && <p className="notice notice-ok" role="status">{state.ok}</p>}
      <button className="sbtn" type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>Close the studio</button>
    </form>
  );
}
