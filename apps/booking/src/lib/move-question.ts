import { formatDayShort, formatTime, vnDateKey } from "@/lib/time";

/**
 * The question before a drag-move (Jack, 4 Nov): from when, to when, and who gets an email. Emails wait
 * 10 minutes, so a slip moved straight back emails nobody, and a quick correction sends one email, not two.
 */
export function moveQuestion(s: { title: string; startsAt: string; taken: number; instructorId: string | null; instructorName: string | null }, newStartIso: string, meId: string) {
  const when = (iso: string) => `${formatDayShort(vnDateKey(iso), "en")}, ${formatTime(iso, "en")}`;
  const who = [
    s.taken > 0 ? `the ${s.taken === 1 ? "person" : `${s.taken} people`} booked` : null,
    s.instructorId && s.instructorId !== meId ? `${s.instructorName ?? "the instructor"} (instructor)` : null,
  ].filter(Boolean);
  return [
    `Move ${s.title}`,
    `from ${when(s.startsAt)}`,
    `to ${when(newStartIso)}?`,
    "",
    who.length
      ? `${who.join(" and ")} will get an email. Emails go out 10 minutes after the move, so if this is a slip, move it back and nobody is emailed.`
      : "Nobody is booked, so no emails are sent.",
  ].join("\n");
}
