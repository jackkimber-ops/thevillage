"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { moveSessionAction } from "@/lib/actions/staff";
import type { StaffSession } from "@/lib/data/staff-types";
import { staffError } from "@/lib/staff-errors";
import { formatTime, vnDateKey } from "@/lib/time";
import { sessionLine } from "@/lib/staff-format";

const PX = 56; // per hour
const SNAP = 15; // minutes

const hourOf = (iso: string) => {
  const [h, m] = formatTime(iso, "en").split(":").map(Number);
  return h + m / 60;
};

type Props = {
  days: string[];
  today: string;
  sessions: StaffSession[];
  meId: string;
  isManager: boolean;
};

/** Day or week grid. Drag a block to a new day or time; it snaps to 15 minutes and asks the server to move it. */
export function CalendarGrid({ days, today, sessions, meId, isManager }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const origin = useRef<{ x: number; y: number; colWidth: number } | null>(null);
  const dragged = useRef(false); // stops the click that follows a drag from opening the session

  const startHour = Math.min(8, ...sessions.map((s) => Math.floor(hourOf(s.startsAt))));
  const endHour = Math.max(18, ...sessions.map((s) => Math.ceil(hourOf(s.endsAt))));
  const height = (endHour - startHour) * PX;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const movable = (s: StaffSession) => s.status === "scheduled" && new Date(s.startsAt) > new Date() && (isManager || s.instructorId === meId);

  function onPointerDown(e: React.PointerEvent<HTMLAnchorElement>, s: StaffSession) {
    if (!movable(s)) return;
    const col = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    origin.current = { x: e.clientX, y: e.clientY, colWidth: col.width };
    setDrag({ id: s.id, dx: 0, dy: 0 });
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag || !origin.current) return;
    setDrag({ ...drag, dx: e.clientX - origin.current.x, dy: e.clientY - origin.current.y });
  }

  function onPointerUp(e: React.PointerEvent, s: StaffSession) {
    if (!drag || drag.id !== s.id || !origin.current) return;
    const dayShift = Math.round(drag.dx / (origin.current.colWidth + 3));
    const minuteShift = Math.round(((drag.dy / PX) * 60) / SNAP) * SNAP;
    setDrag(null);
    if (Math.abs(drag.dx) < 4 && Math.abs(drag.dy) < 4) return; // a click: follow the link
    e.preventDefault();
    dragged.current = true;
    if (dayShift === 0 && minuteShift === 0) return;
    const newStart = new Date(new Date(s.startsAt).getTime() + dayShift * 86400000 + minuteShift * 60000);
    const msg = `Move ${s.title} to ${vnDateKey(newStart.toISOString())} at ${formatTime(newStart, "en")}? ${s.taken > 0 ? "Everyone booked will be emailed." : ""}`;
    if (!window.confirm(msg)) return;
    start(async () => {
      const res = await moveSessionAction(s.id, newStart.toISOString());
      setError(res.error ? staffError(res.error) : null);
      router.refresh();
    });
  }

  return (
    <div>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <div className="staff-grid" style={{ gridTemplateColumns: `40px repeat(${days.length}, minmax(0, 1fr))`, opacity: pending ? 0.6 : 1 }}>
        <span />
        {days.map((d) => (
          <div key={d} className={`week-day${d === today ? " today" : ""}`}>
            {new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short" }).format(new Date(`${d}T00:00:00Z`))}
            <strong>{Number(d.slice(8))}</strong>
          </div>
        ))}
        <div style={{ position: "relative", height }}>
          {hours.map((h) => <span key={h} className="week-hour" style={{ top: (h - startHour) * PX - 6 }}>{h}:00</span>)}
        </div>
        {days.map((d) => (
          <div key={d} className="week-col staff-col" style={{ height }}>
            {hours.map((h) => <span key={h} className="hour-line" style={{ top: (h - startHour) * PX }} />)}
            {sessions.filter((s) => vnDateKey(s.startsAt) === d).map((s) => {
              const top = (hourOf(s.startsAt) - startHour) * PX + 1;
              const h = (hourOf(s.endsAt) - hourOf(s.startsAt)) * PX - 2;
              const moving = drag?.id === s.id;
              return (
                <a
                  key={s.id}
                  href={`/staff/sessions/${s.id}`}
                  className={`staff-block kind-${s.kind}${movable(s) ? " movable" : ""}${s.capacity !== null && s.taken >= s.capacity ? " full" : ""}`}
                  style={{ top, height: h, transform: moving ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined, zIndex: moving ? 5 : 1 }}
                  onPointerDown={(e) => onPointerDown(e, s)}
                  onPointerMove={onPointerMove}
                  onPointerUp={(e) => onPointerUp(e, s)}
                  onClick={(e) => {
                    if (dragged.current) {
                      e.preventDefault();
                      dragged.current = false;
                    }
                  }}
                  aria-label={`${s.title}, ${formatTime(s.startsAt, "en")}, ${sessionLine(s)}`}
                  draggable={false}
                >
                  <b>{formatTime(s.startsAt, "en")} {s.title}</b>
                  <span>{s.instructorName ?? ""}</span>
                  <span>{sessionLine(s)}</span>
                </a>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
