import { addDays, vnDateKey } from "./time";

/** Free cancellation ends at the cutoff time (e.g. 20:00) on the evening before the session, Saigon time. */
export function cancelCutoff(startsAt: string, cutoffTime: string): Date {
  return new Date(`${addDays(vnDateKey(startsAt), -1)}T${cutoffTime}:00+07:00`);
}
