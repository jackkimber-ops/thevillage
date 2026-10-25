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
  /** Pay-on-the-day prices from the catalog: a class (per parent) and open play (per child). */
  dropInPrices(): Promise<{ classVnd: number | null; openPlayVnd: number | null }>;
  timetable(from: Date, to: Date): Promise<TimetableEntry[]>;
  session(id: string, locale: string): Promise<SessionDetail | null>;
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
