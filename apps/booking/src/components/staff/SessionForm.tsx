"use client";

import { useActionState, useState } from "react";
import { saveSessionAction } from "@/lib/actions/staff";
import type { SessionType } from "@/lib/data/staff-types";
import { StaffFormError } from "./StaffFormError";
import { keepValues } from "@/lib/keep-values";

type Initial = {
  id?: string;
  sessionTypeId: string;
  title: string;
  date: string;
  time: string;
  minutes: number;
  capacity: number | null;
  instructorId: string | null;
  notes: string | null;
};

export function SessionForm({ initial, types, instructors, lockInstructor }: {
  initial: Initial;
  types: SessionType[];
  instructors: Array<{ userId: string; name: string }>;
  lockInstructor: string | null;
}) {
  const [state, action, pending] = useActionState(saveSessionAction, undefined);
  const [typeId, setTypeId] = useState(initial.sessionTypeId);
  const [repeat, setRepeat] = useState("once");
  const type = types.find((t) => t.id === typeId);
  const isNew = !initial.id;
  const [title, setTitle] = useState(initial.title);
  const [minutes, setMinutes] = useState(initial.minutes);
  const [capacity, setCapacity] = useState(initial.capacity === null ? "" : String(initial.capacity));

  function chooseType(id: string) {
    setTypeId(id);
    const t = types.find((x) => x.id === id);
    if (t && isNew) {
      if (!title || types.some((x) => x.name === title)) setTitle(t.name);
      setMinutes(t.defaultMinutes);
      setCapacity(t.defaultCapacity === null ? "" : String(t.defaultCapacity));
    }
  }

  return (
    <form onSubmit={keepValues(action)} className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {isNew ? (
        <div className="field">
          <label htmlFor="type">Session type</label>
          <select id="type" name="sessionTypeId" value={typeId} onChange={(e) => chooseType(e.target.value)}>
            {types.filter((t) => t.active && t.kind !== "workshop").map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      ) : (
        <p className="muted small" style={{ margin: 0 }}>{type?.name}</p>
      )}
      <div className="form-grid">
        <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="title">Title</label><input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
        <div className="field"><label htmlFor="date">Date</label><input id="date" name="date" type="date" defaultValue={initial.date} required /></div>
        <div className="field"><label htmlFor="time">Start</label><input id="time" name="time" type="time" step={900} defaultValue={initial.time} required /></div>
        <div className="field"><label htmlFor="minutes">Length (minutes)</label><input id="minutes" name="minutes" type="number" min={15} max={480} step={15} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} required /></div>
        {type?.kind !== "private_hire" && (
          <div className="field"><label htmlFor="capacity">{type?.kind === "open_play" ? "Capacity (children)" : "Capacity"}</label><input id="capacity" name="capacity" type="number" min={1} max={200} value={capacity} onChange={(e) => setCapacity(e.target.value)} required /></div>
        )}
        {type?.kind !== "private_hire" && (
          <div className="field">
            <label htmlFor="instructor">Instructor</label>
            {lockInstructor ? (
              <>
                <input type="hidden" name="instructorId" value={lockInstructor} />
                <input id="instructor" value={instructors.find((i) => i.userId === lockInstructor)?.name ?? "Me"} readOnly className="readonly" />
              </>
            ) : (
              <select id="instructor" name="instructorId" defaultValue={initial.instructorId ?? ""}>
                <option value="">No instructor (staff)</option>
                {instructors.map((i) => <option key={i.userId} value={i.userId}>{i.name}</option>)}
              </select>
            )}
          </div>
        )}
      </div>
      {isNew && (
        <div className="form-grid">
          <div className="field">
            <span className="field-label" id="repeat-label">Repeat</span>
            <input type="hidden" name="repeat" value={repeat} />
            <div className="segmented" role="group" aria-labelledby="repeat-label">
              <button type="button" className="segmented-button" aria-pressed={repeat === "once"} onClick={() => setRepeat("once")}>Just once</button>
              <button type="button" className="segmented-button" aria-pressed={repeat === "weekly"} onClick={() => setRepeat("weekly")}>Every week</button>
            </div>
          </div>
          {repeat === "weekly" && <div className="field"><label htmlFor="until">Until</label><input id="until" name="repeatUntil" type="date" required /></div>}
        </div>
      )}
      <div className="field">
        <label htmlFor="notes">{type?.kind === "private_hire" ? "Customer, group size, agreed price and notes" : "Notes for staff (optional)"}</label>
        <textarea id="notes" name="notes" rows={2} defaultValue={initial.notes ?? ""} />
      </div>
      {type?.description && <p className="muted small" style={{ margin: 0 }}>Customers see the class description: {type.description}</p>}
      <StaffFormError code={state?.error} />
      <div className="staff-actions">
        <button className="sbtn" type="submit" disabled={pending}>{isNew ? "Create" : "Save"}</button>
      </div>
    </form>
  );
}
