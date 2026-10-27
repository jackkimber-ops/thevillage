"use client";

import { useActionState } from "react";
import { ContactChoice } from "@/components/forms/ContactChoice";
import { updateCustomerAction } from "@/lib/actions/staff";
import { keepValues } from "@/lib/keep-values";
import type { CustomerProfile } from "@/lib/data/staff-types";
import { StaffFormError } from "./StaffFormError";

/** S22: change a customer's name, phone, email, way to reach them and email language. */
export function EditCustomerForm({ c }: { c: CustomerProfile }) {
  const [state, action, pending] = useActionState(updateCustomerAction, undefined);
  return (
    <form onSubmit={keepValues(action)} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
      <input type="hidden" name="customerId" value={c.customerId} />
      <div className="field"><label htmlFor="en">Name</label><input id="en" name="fullName" defaultValue={c.fullName} required /></div>
      <div className="field"><label htmlFor="ep">Mobile number</label><input id="ep" name="phone" type="tel" defaultValue={c.phone ?? ""} required /></div>
      <ContactChoice initial={c.preferredContact} />
      <div className="field">
        <label htmlFor="ee">Email (their login)</label>
        <input id="ee" name="email" type="email" defaultValue={c.email ?? ""} />
        <span className="muted small">Changing it moves their login to the new address.</span>
      </div>
      <div className="field">
        <label htmlFor="el">Email language</label>
        <select id="el" name="language" defaultValue={c.language}><option value="en">English</option><option value="vi">Tiếng Việt</option></select>
      </div>
      <StaffFormError code={state?.error} />
      <button className="sbtn" type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>Save details</button>
    </form>
  );
}
