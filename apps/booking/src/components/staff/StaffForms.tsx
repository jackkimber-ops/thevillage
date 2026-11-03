"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveStaffAction } from "@/lib/actions/staff";
import type { StaffListRow } from "@/lib/data/staff-types";
import { StaffFormError } from "./StaffFormError";
import { keepValues } from "@/lib/keep-values";
import { useClearOnSuccess } from "@/lib/clear-on-success";

const ACCESS = [
  { v: "own_sessions", l: "Own sessions only" },
  { v: "all_customers", l: "All customers" },
] as const;

/** Role, and for instructors what they can see. Managers always see everything. */
function RoleFields({ role: initialRole, access, locked = false }: { role: StaffListRow["role"]; access: StaffListRow["access"]; locked?: boolean }) {
  const [role, setRole] = useState(initialRole);
  const select = useRef<HTMLSelectElement>(null);
  // When the add form empties after a save, the role goes back to what it started as.
  useEffect(() => {
    const form = select.current?.form;
    const back = () => setRole(initialRole);
    form?.addEventListener("reset", back);
    return () => form?.removeEventListener("reset", back);
  }, [initialRole]);
  return (
    <>
      <div className="field"><label>Role
        {/* Your own role is locked: another manager changes it (the database refuses it too). */}
        {locked && <input type="hidden" name="role" value={role} />}
        <select ref={select} name={locked ? undefined : "role"} value={role} disabled={locked} onChange={(e) => setRole(e.target.value as StaffListRow["role"])}>
          <option value="instructor">Instructor</option>
          <option value="manager">Manager</option>
        </select>
      </label></div>
      {role === "instructor" ? (
        <div className="field"><label>Can see
          <select name="access" defaultValue={access}>{ACCESS.map((a) => <option key={a.v} value={a.v}>{a.l}</option>)}</select>
        </label></div>
      ) : (
        <div className="field"><span className="field-label">Can see</span><span className="muted small" style={{ paddingTop: 10 }}>Everything (manager)</span></div>
      )}
    </>
  );
}

export function StaffRowForm({ person, isMe }: { person: StaffListRow; isMe: boolean }) {
  const [state, action, pending] = useActionState(saveStaffAction, undefined);
  const lastIn = person.lastSignInAt
    ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(person.lastSignInAt))
    : "never";
  return (
    <form onSubmit={keepValues(action)} className={`card${person.active ? "" : " staff-off"}`} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="hidden" name="userId" value={person.userId} />
      <input type="hidden" name="email" value={person.email} />
      <div className="row-between">
        <strong>{person.name}{isMe && <span className="muted"> (you)</span>}</strong>
        <span className={`tag ${person.active ? "tag-ok" : "tag-todo"}`}>{person.active ? (person.role === "manager" ? "Manager" : "Instructor") : "Switched off"}</span>
      </div>
      <span className="muted small">{person.email} · last logged in {lastIn}</span>
      <div className="form-grid">
        <div className="field"><label>Name<input name="name" defaultValue={person.name} required /></label></div>
        <RoleFields role={person.role} access={person.access} locked={isMe} />
      </div>
      <StaffFormError code={state?.error} />
      {state?.ok && <p className="notice notice-ok" role="status">{state.ok}</p>}
      <div className="row">
        <button className="sbtn" type="submit" name="active" value={person.active ? "on" : "off"} disabled={pending}>Save</button>
        {!isMe && (person.active ? (
          <button className="sbtn2" type="submit" name="active" value="off" disabled={pending}>Switch off access</button>
        ) : (
          <button className="sbtn2" type="submit" name="active" value="on" disabled={pending}>Switch access back on</button>
        ))}
      </div>
    </form>
  );
}

export function AddStaffForm() {
  const [state, action, pending] = useActionState(saveStaffAction, undefined);
  const ref = useClearOnSuccess(state);
  return (
    <form ref={ref} onSubmit={keepValues(action)} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="form-grid">
        <div className="field"><label>Name<input name="name" required /></label></div>
        <div className="field"><label>Email (their login)<input name="email" type="email" required /></label></div>
        <RoleFields role="instructor" access="own_sessions" />
      </div>
      <p className="muted small" style={{ margin: 0 }}>They log in at the staff app with this email: we send them a 6-digit code, no password.</p>
      <StaffFormError code={state?.error} />
      {state?.ok && <p className="notice notice-ok" role="status">{state.ok}</p>}
      <button className="sbtn" type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>Add to staff</button>
    </form>
  );
}
