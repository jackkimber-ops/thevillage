export type SessionKind = "class" | "open_play" | "private_hire" | "workshop";

export interface StudioSettings {
  name: string;
  address: string;
  openingHours: string;
  contactEmail: string;
  contactPhone: string;
  whatsappUrl: string | null;
  zaloUrl: string | null;
  messengerUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  mapsUrl: string | null;
  cancelCutoffTime: string; // "20:00"
  bookingWindowDays: number;
}

export interface TimetableEntry {
  id: string;
  sessionTypeId: string;
  kind: SessionKind;
  title: string;
  startsAt: string;
  endsAt: string;
  instructorName: string | null;
  priceVnd: number | null;
  capacity: number | null;
  placesLeft: number | null; // null for open play (customers only see "Full")
  isFull: boolean;
}

export interface SessionDetail extends TimetableEntry {
  description: string | null;
  suits: string | null;
  bring: string | null;
  colour: string;
  pictureUrl: string | null;
}

export interface DataSource {
  settings(): Promise<StudioSettings>;
  timetable(from: Date, to: Date): Promise<TimetableEntry[]>;
  session(id: string, locale: string): Promise<SessionDetail | null>;
}
