export type SessionKind = "class" | "open_play" | "private_hire" | "workshop";

export interface StudioSettings {
  name: string;
  address: string;
  openingHours: string;
  /** The same line in Vietnamese (team feedback 2 Nov); pick with openingHoursIn. */
  openingHoursVi: string;
  contactEmail: string;
  contactPhone: string;
  whatsappUrl: string | null;
  zaloUrl: string | null;
  messengerUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  mapsUrl: string | null;
  cancelCutoffTime: string; // "21:00"
  bookingWindowDays: number;
  /** Largest group for a private hire, shown on the hire page. */
  hireMaxGroup: number;
  /** Show places left once this few remain (0 = never, only "Full"). */
  placesHintAt: number;
}

/** Opening hours in the page's or email's language. */
export function openingHoursIn(s: Pick<StudioSettings, "openingHours" | "openingHoursVi">, locale: string): string {
  return locale === "vi" ? s.openingHoursVi : s.openingHours;
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
  /** Classes only, and only when few are left (studio setting, 3): "Only 3 places left" (team feedback 9 Nov). */
  placesLeft: number | null;
  isFull: boolean;
  /** Few places left, not full: "Almost full" for Open Play (no number). */
  almostFull: boolean;
  /** Too close to the start to book online (the studio's latest-booking setting, 1 hour at launch). */
  bookingClosed: boolean;
  typeName: string;
  colour: string;
  pictureUrl: string | null; // the class type's badge (change list #5)
}

export interface SessionDetail extends TimetableEntry {
  /** A short line under the name (owners' taglines, 3 Nov). */
  tagline: string | null;
  description: string | null;
  suits: string | null;
  bring: string | null;
}

/** M1: days the studio is closed (Tết, holidays), inclusive Vietnam dates. */
export interface Closure {
  id: string;
  startsOn: string;
  endsOn: string;
  reason: string;
}

export interface DataSource {
  settings(): Promise<StudioSettings>;
  /** Pay-on-the-day prices from the catalog: a class (per parent) and open play (per child). */
  dropInPrices(): Promise<{ classVnd: number | null; openPlayVnd: number | null }>;
  timetable(from: Date, to: Date): Promise<TimetableEntry[]>;
  session(id: string, locale: string): Promise<SessionDetail | null>;
  /** Closures that overlap these Vietnam dates. */
  closures(from: string, to: string): Promise<Closure[]>;
}

export type ContactMethod = "whatsapp" | "zalo" | "call";
export type BookingStatus = "booked" | "attended" | "no_show" | "cancelled" | "late_cancelled";

export interface Child {
  id: string;
  name: string;
  birthMonth: string; // "YYYY-MM-01"
}

export interface Me {
  customerId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  preferredContact: ContactMethod;
  children: Child[];
}

export interface MyPack {
  id: string;
  name: string;
  credits: number;
  remaining: number; // balance: can be booked now
  reserved: number;  // held by upcoming bookings
  used: number;
  validFrom: string;
  lastDay: string;   // includes pause days
  pausedDays: number;
  sessionTypeIds: string[];
}

export interface MyBooking {
  id: string;
  status: BookingStatus;
  session: { id: string; title: string; kind: SessionKind; startsAt: string; endsAt: string; sessionTypeId: string };
  parents: number;
  children: number;
  childNames: string[];
  credits: number;
  packName: string | null;
  unpaid: boolean;
  amountDueVnd: number;
  freeTrial: boolean;
}

export interface PackOnSale {
  id: string;
  name: string;
  credits: number;
  priceVnd: number;
  validityMonths: number | null;
  validityDays: number | null;
  isIntro: boolean;
}

export interface GuestDetails {
  sessionId: string;
  fullName: string;
  phone: string;
  email: string;
  preferredContact: ContactMethod;
  language: "en" | "vi";
  children: Array<{ name: string; birthMonth: string }>;
}

/** A failed action: `code` is a short reason from the database (e.g. "session_full"), translated in the UI. */
export class ActionError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface Account {
  user(): Promise<AuthUser | null>;
  sendCode(email: string, next: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<void>;
  signOut(): Promise<void>;
  /** C11/S8: the secret calendar feed token (made on first use; `fresh` replaces it, so an old link stops working). */
  calendarToken(fresh: boolean): Promise<string>;

  me(): Promise<Me | null>;
  saveDetails(d: { fullName: string; phone: string; preferredContact: ContactMethod; language: "en" | "vi" }): Promise<void>;
  addChild(name: string, birthMonth: string): Promise<string>;

  myPacks(): Promise<MyPack[]>;
  myBookings(): Promise<MyBooking[]>;
  book(sessionId: string, childIds: string[], parents: number): Promise<string>;
  cancel(bookingId: string): Promise<BookingStatus>;
  guestBook(d: GuestDetails): Promise<string>;
  packsOnSale(): Promise<PackOnSale[]>;
}
