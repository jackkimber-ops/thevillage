"use client";

import { useActionState } from "react";
import { savePackTypeAction, saveSessionTypeAction } from "@/lib/actions/staff";
import type { PackType, SessionType } from "@/lib/data/staff-types";
import { StaffFormError } from "./StaffFormError";

const KINDS = [
  { v: "class", l: "Group class" },
  { v: "open_play", l: "Open play" },
  { v: "private_hire", l: "Private hire" },
] as const;

export function PackTypeForm({ pack, types }: { pack: PackType | null; types: SessionType[] }) {
  const [state, action, pending] = useActionState(savePackTypeAction, undefined);
  const unit = pack?.validityDays ? "days" : "months";
  return (
    <form action={action} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="hidden" name="id" value={pack?.id ?? ""} />
      <div className="form-grid">
        <div className="field"><label>Name<input name="name" defaultValue={pack?.name ?? ""} required /></label></div>
        <div className="field"><label>Credits<input name="credits" type="number" min={1} defaultValue={pack?.credits ?? 10} required /></label></div>
        <div className="field"><label>Price (VND)<input name="price" inputMode="numeric" defaultValue={pack?.priceVnd ?? ""} required /></label></div>
        <div className="field"><label>Valid for<input name="validity" type="number" min={1} defaultValue={pack?.validityMonths ?? pack?.validityDays ?? 3} required /></label></div>
        <div className="field"><label>Unit<select name="validityUnit" defaultValue={unit}><option value="months">months</option><option value="days">days</option></select></label></div>
      </div>
      <fieldset className="child-fields" style={{ padding: 0 }}>
        <legend className="field-label">Can be used for</legend>
        <div className="row">
          {types.filter((t) => t.kind === "class" || t.kind === "open_play").map((t) => (
            <label key={t.id} className="check" style={{ minHeight: 32 }}><input type="checkbox" name="covers" value={t.id} defaultChecked={pack ? pack.coversSessionTypeIds.includes(t.id) : t.kind === "class"} />{t.name}</label>
          ))}
        </div>
      </fieldset>
      <div className="row">
        <label className="check" style={{ minHeight: 32 }}><input type="checkbox" name="onSale" defaultChecked={pack?.onSale ?? true} />On sale</label>
        <label className="check" style={{ minHeight: 32 }}><input type="checkbox" name="isIntro" defaultChecked={pack?.isIntro ?? false} />Intro pack (new customers only, one each)</label>
      </div>
      <StaffFormError code={state?.error} />
      {state?.ok && <p className="notice notice-ok" role="status">Saved. Price changes apply to new sales only.</p>}
      <button className="sbtn" type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>{pack ? "Save" : "Add pack"}</button>
    </form>
  );
}

export function SessionTypeForm({ type }: { type: SessionType | null }) {
  const [state, action, pending] = useActionState(saveSessionTypeAction, undefined);
  return (
    <form action={action} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="hidden" name="id" value={type?.id ?? ""} />
      <div className="form-grid">
        <div className="field"><label>Name<input name="name" defaultValue={type?.name ?? ""} required /></label></div>
        <div className="field"><label>Type<select name="kind" defaultValue={type?.kind ?? "class"} disabled={Boolean(type)}>{KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}</select></label></div>
        {type && <input type="hidden" name="kind" value={type.kind} />}
        <div className="field"><label>Length (minutes)<input name="minutes" type="number" min={15} step={15} defaultValue={type?.defaultMinutes ?? 60} required /></label></div>
        <div className="field"><label>Capacity<input name="capacity" type="number" min={1} defaultValue={type?.defaultCapacity ?? 10} /></label></div>
        <div className="field"><label>Drop-in price (VND)<input name="price" inputMode="numeric" defaultValue={type?.dropInPriceVnd ?? ""} /></label></div>
      </div>
      <div className="field"><label>Description customers see<textarea name="description" rows={2} defaultValue={type?.description ?? ""} /></label></div>
      <label className="check" style={{ minHeight: 32 }}><input type="checkbox" name="active" defaultChecked={type?.active ?? true} />Active</label>
      <StaffFormError code={state?.error} />
      {state?.ok && <p className="notice notice-ok" role="status">Saved.</p>}
      <button className="sbtn" type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>{type ? "Save" : "Add class type"}</button>
    </form>
  );
}
