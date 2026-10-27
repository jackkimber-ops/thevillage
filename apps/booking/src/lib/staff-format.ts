import type { StaffSession } from "@/lib/data/staff-types";

/** "8/10 · 2 pay on the day", "5/10 children", "2 h · Nguyen family". */
export function sessionLine(s: StaffSession) {
  if (s.kind === "private_hire") return `${Math.round((new Date(s.endsAt).getTime() - new Date(s.startsAt).getTime()) / 3600000)} h${s.hireCustomer ? ` · ${s.hireCustomer}` : ""}`;
  // No capacity means no limit (open play at launch): just the count.
  const booked = s.capacity === null ? `${s.taken}` : `${s.taken}/${s.capacity}`;
  const count = s.kind === "open_play" ? `${booked} ${s.taken === 1 && s.capacity === null ? "child" : "children"}` : booked;
  const full = s.capacity !== null && s.taken >= s.capacity ? " · full" : "";
  return `${count}${s.unpaid ? ` · ${s.unpaid} pay on the day` : ""}${full}`;
}
