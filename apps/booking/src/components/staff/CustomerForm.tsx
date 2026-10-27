"use client";

import { useActionState, useState } from "react";
import { ContactChoice } from "@/components/forms/ContactChoice";
import { addCustomerAction } from "@/lib/actions/staff";
import { StaffFormError } from "./StaffFormError";
import { keepValues } from "@/lib/keep-values";

export function CustomerForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(addCustomerAction, undefined);
  const [kids, setKids] = useState(0);
  return (
    <form onSubmit={keepValues(action)} className="card" style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 520 }}>
      <input type="hidden" name="next" value={next} />
      <div className="field"><label htmlFor="n">Name</label><input id="n" name="fullName" required /></div>
      <div className="field"><label htmlFor="p">Mobile number</label><input id="p" name="phone" type="tel" placeholder="090 123 4567" required /></div>
      <ContactChoice />
      <div className="field"><label htmlFor="e">Email (optional, needed to log in)</label><input id="e" name="email" type="email" /></div>
      {Array.from({ length: kids }, (_, i) => (
        <div key={i} className="form-grid">
          <div className="field"><label htmlFor={`k${i}`}>Child {i + 1} name</label><input id={`k${i}`} name={`child${i + 1}Name`} /></div>
          <div className="field"><label htmlFor={`m${i}`}>Month and year of birth</label><input id={`m${i}`} name={`child${i + 1}Month`} type="month" /></div>
        </div>
      ))}
      {kids < 3 && <button type="button" className="sbtn2" style={{ alignSelf: "flex-start" }} onClick={() => setKids(kids + 1)}>+ Add a child</button>}
      <StaffFormError code={state?.error} />
      <button className="sbtn" type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>Save customer</button>
    </form>
  );
}
