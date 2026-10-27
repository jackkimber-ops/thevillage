"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { customerChildrenAction, findCustomersAction, staffBookAction } from "@/lib/actions/staff";
import type { CustomerHit } from "@/lib/data/staff-types";
import { StaffFormError } from "./StaffFormError";
import { keepValues } from "@/lib/keep-values";

type SessionOption = { id: string; label: string; kind: string };

export function BookSomeoneForm(p: {
  sessions: SessionOption[];
  sessionId: string | null;
  customer: { id: string; name: string } | null;
  isManager: boolean;
  trial: boolean;
  back: string;
}) {
  const [state, action, pending] = useActionState(staffBookAction, undefined);
  const [sessionId, setSessionId] = useState(p.sessionId ?? "");
  const [customer, setCustomer] = useState(p.customer);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [searched, setSearched] = useState(""); // the text the current hits are for
  const [info, setInfo] = useState<{ children: Array<{ id: string; name: string }>; hadFreeTrial: boolean } | null>(null);
  const [, start] = useTransition();
  const kind = p.sessions.find((s) => s.id === sessionId)?.kind;

  useEffect(() => {
    if (!customer) return;
    let live = true;
    customerChildrenAction(customer.id).then((r) => { if (live) setInfo(r); });
    return () => { live = false; };
  }, [customer]);

  function search(value: string) {
    setQ(value);
    if (value.trim().length < 2) { setHits([]); setSearched(""); return; }
    start(async () => {
      setHits(await findCustomersAction(value));
      setSearched(value);
    });
  }

  const newCustomerHref = `/staff/customers/new?next=${encodeURIComponent(`/staff/book?session=${sessionId}&back=${encodeURIComponent(p.back)}`)}`;

  return (
    <form onSubmit={keepValues(action)} className="card" style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
      <input type="hidden" name="back" value={p.back} />
      <div className="field">
        <label htmlFor="session">Session</label>
        <select id="session" name="sessionId" value={sessionId} onChange={(e) => setSessionId(e.target.value)} required>
          <option value="">Choose a session…</option>
          {p.sessions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {customer ? (
        <div className="list-row">
          <span><strong>{customer.name}</strong></span>
          <button type="button" className="link-button" onClick={() => { setCustomer(null); setInfo(null); }}>Change</button>
          <input type="hidden" name="customerId" value={customer.id} />
        </div>
      ) : (
        <div className="field">
          <label htmlFor="find">Customer: name, phone or email</label>
          <input id="find" value={q} onChange={(e) => search(e.target.value)} autoComplete="off" />
          {hits.map((h) => (
            <button key={h.customerId} type="button" className="list-row link-row" onClick={() => { setCustomer({ id: h.customerId, name: h.fullName }); setHits([]); }}>
              <span>{h.fullName}</span><span className="muted small">{h.phone}</span>
            </button>
          ))}
          {hits.length > 0 && <p className="muted small" style={{ margin: 0 }}>Tap the customer to choose them.</p>}
          {hits.length === 0 && searched === q && q.trim().length >= 2 && (
            <p className="muted small" style={{ margin: 0 }}>No customer found. Try just a name or phone number, or add a new customer.</p>
          )}
          <Link href={newCustomerHref} className="small-link">+ Add a new customer</Link>
        </div>
      )}

      {customer && info && (
        <fieldset className="child-fields" style={{ padding: 0 }}>
          <legend className="field-label">Who&apos;s coming</legend>
          {info.children.map((k) => <label key={k.id} className="check"><input type="checkbox" name="child" value={k.id} defaultChecked={kind === "open_play"} />{k.name}</label>)}
          <div className="form-grid">
            <div className="field"><label htmlFor="unnamed">Other children (not on file)</label><input id="unnamed" name="unnamed" type="number" min={0} max={2} defaultValue={0} /></div>
          </div>
          {kind === "open_play" && <label className="check"><input type="checkbox" name="secondParent" />A second parent (free)</label>}
        </fieldset>
      )}

      <label className="check"><input type="checkbox" name="override" />Override booking times (outside the 1-month window or less than 1 hour before). Capacity is never overridden.</label>
      {p.isManager && kind === "class" && !info?.hadFreeTrial && (
        <label className="check"><input type="checkbox" name="freeTrial" defaultChecked={p.trial} />Free trial (one per customer)</label>
      )}
      <StaffFormError code={state?.error} />
      <button className="sbtn" type="submit" disabled={pending || !customer || !sessionId} style={{ alignSelf: "flex-start" }}>Book</button>
      {(!customer || !sessionId) && (
        <p className="muted small" style={{ margin: 0 }} role="status">
          {!sessionId && !customer ? "Choose a session and a customer to book." : !sessionId ? "Choose a session to book." : "Choose a customer from the list to book."}
        </p>
      )}
      <p className="muted small" style={{ margin: 0 }}>Uses the customer&apos;s pack if they have one; otherwise it&apos;s pay on the day. They get the confirmation email.</p>
    </form>
  );
}
