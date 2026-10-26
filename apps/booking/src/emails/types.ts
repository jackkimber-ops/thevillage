import type { SessionKind, StudioSettings } from "@/lib/data/types";

export type EmailKind = "booking_confirmation" | "reminder" | "session_moved" | "session_cancelled";

/** Everything one customer email needs, read from the database when it is sent. */
export interface EmailData {
  kind: EmailKind;
  lang: "en" | "vi";
  firstName: string;
  title: string;
  sessionKind: SessionKind;
  startsAt: string;
  endsAt: string;
  childNames: string[];
  parents: number;
  credits: number;
  packName: string | null;
  unpaid: boolean;
  amountDueVnd: number;
  freeTrial: boolean;
  cancelCutoff: string;
  oldStartsAt: string | null;
  reason: string | null;
  appUrl: string; // https://book.thevillagesaigon.com
  settings: StudioSettings;
}
