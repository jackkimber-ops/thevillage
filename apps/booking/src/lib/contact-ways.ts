import type { ContactWay } from "@/lib/data";

/** How staff got in touch (get-in-touch list and contact history). */
export const WAY_LABEL: Record<ContactWay, string> = { whatsapp: "WhatsApp", zalo: "Zalo", call: "Call", in_person: "In person" };
export const WAYS = Object.keys(WAY_LABEL) as ContactWay[];
/** "on WhatsApp", "by phone", "in person". */
export const wayPhrase = (w: ContactWay) => (w === "call" ? "by phone" : w === "in_person" ? "in person" : `on ${WAY_LABEL[w]}`);
