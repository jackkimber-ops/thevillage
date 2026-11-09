"use client";

import { useActionState } from "react";
import { saveSettingsAction } from "@/lib/actions/staff";
import type { EditableSettings } from "@/lib/data/staff-types";
import { StaffFormError } from "./StaffFormError";
import { keepValues } from "@/lib/keep-values";

function Text({ name, label, value, type = "text", hint, required = false }: { name: string; label: string; value: string | null; type?: string; hint?: string; required?: boolean }) {
  return (
    <div className="field">
      <label>{label}<input name={name} type={type} defaultValue={value ?? ""} required={required} /></label>
      {hint && <span className="muted small">{hint}</span>}
    </div>
  );
}

export function SettingsForm({ s }: { s: EditableSettings }) {
  const [state, action, pending] = useActionState(saveSettingsAction, undefined);
  return (
    <form onSubmit={keepValues(action)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="grid-2">
        <section className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="heading sec">studio</h2>
          <Text name="name" label="Name" value={s.name} required />
          <Text name="address" label="Address" value={s.address} required />
          <Text name="openingHours" label="Opening hours (English)" value={s.openingHours} required />
          <Text name="openingHoursVi" label="Opening hours (Vietnamese)" value={s.openingHoursVi} required />
          <Text name="mapsUrl" label="Google Maps link" value={s.mapsUrl} type="url" />
        </section>
        <section className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="heading sec">booking rules</h2>
          <div className="field">
            <label>Free cancellation until (the evening before)<input name="cancelCutoffTime" type="time" defaultValue={s.cancelCutoffTime} required /></label>
            <span className="muted small">After this, Cancel becomes &ldquo;Message us&rdquo; and staff cancel.</span>
          </div>
          <div className="form-grid">
            <div className="field"><label>Book up to<input name="windowN" type="number" min={1} defaultValue={s.bookingWindow.n} required /></label></div>
            <div className="field"><label>ahead (unit)
              <select name="windowUnit" defaultValue={s.bookingWindow.unit}><option value="months">months</option><option value="days">days</option></select>
            </label></div>
          </div>
          <div className="field">
            <label>Online booking closes (minutes before the start)<input name="latestMinutes" type="number" min={0} defaultValue={s.latestBookingMinutes} required /></label>
            <span className="muted small">Staff can still book people in later, and further ahead.</span>
          </div>
          <Text name="placesHintAt" label="Show &ldquo;Only X places left&rdquo; from" value={String(s.placesHintAt)} type="number" required
            hint="Customers see nothing about places until this few are left (Open Play says &ldquo;Almost full&rdquo;). 0 = never, only &ldquo;Full&rdquo;. Staff always see the counts." />
          <Text name="hireMaxGroup" label="Private hire: largest group" value={String(s.hireMaxGroup)} type="number" required />
        </section>
        <section className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="heading sec">contact</h2>
          <Text name="contactEmail" label="Contact email (customers see this)" value={s.contactEmail} type="email" required />
          <Text name="contactPhone" label="Phone" value={s.contactPhone} type="tel" required />
          <Text name="alertEmail" label="Studio alerts go to" value={s.alertEmail} type="email" hint="New customers and unpaid drop-ins. Empty = the contact email." />
        </section>
        <section className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="heading sec">message us and follow us</h2>
          <Text name="whatsappUrl" label="WhatsApp link" value={s.whatsappUrl} type="url" hint="e.g. https://wa.me/84933834068" />
          <Text name="zaloUrl" label="Zalo link" value={s.zaloUrl} type="url" hint="e.g. https://zalo.me/0933834068" />
          <Text name="messengerUrl" label="Messenger link" value={s.messengerUrl} type="url" />
          <Text name="facebookUrl" label="Facebook page" value={s.facebookUrl} type="url" />
          <Text name="instagramUrl" label="Instagram" value={s.instagramUrl} type="url" />
          <span className="muted small">An empty link hides that button.</span>
        </section>
      </div>
      <StaffFormError code={state?.error} />
      {state?.ok && <p className="notice notice-ok" role="status">{state.ok}</p>}
      <button className="sbtn" type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>Save settings</button>
    </form>
  );
}
