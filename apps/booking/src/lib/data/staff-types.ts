import type { BookingStatus, ContactMethod, SessionKind } from "./types";

export type StaffRole = "manager" | "instructor";

export interface StaffMember {
  userId: string;
  role: StaffRole;
  name: string;
  access: "own_sessions" | "all_customers";
}

export interface StaffSession {
  id: string;
  sessionTypeId: string;
  kind: SessionKind;
  title: string;
  startsAt: string;
  endsAt: string;
  status: "scheduled" | "cancelled" | "closed";
  instructorId: string | null;
  instructorName: string | null;
  capacity: number | null;
  taken: number;
  unpaid: number;
  hireCustomer: string | null;
  notes: string | null;
}

export interface ContactItem {
  bookingId: string;
  customerId: string;
  fullName: string;
  phone: string | null;
  preferredContact: ContactMethod;
  firstBooking: boolean;
  unpaid: boolean;
  amountDueVnd: number;
  source: "online" | "staff" | "guest";
  freeTrial: boolean;
  children: number;
  sessionId: string;
  title: string;
  startsAt: string;
}

export interface RosterRow {
  bookingId: string;
  customerId: string;
  fullName: string;
  phone: string | null;
  childNames: string[];
  children: number;
  parents: number;
  status: BookingStatus;
  unpaid: boolean;
  paid: boolean;
  amountDueVnd: number;
  credits: number;
  packName: string | null;
  freeTrial: boolean;
  firstBooking: boolean;
}

export interface CustomerHit {
  customerId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
}

export interface CustomerProfile extends CustomerHit {
  preferredContact: ContactMethod;
  needsReview: boolean;
  createdAt: string;
  children: Array<{ id: string; name: string; birthMonth: string }>;
  packs: Array<{ id: string; name: string; credits: number; remaining: number; validFrom: string; lastDay: string }>;
  bookings: Array<{
    id: string; sessionId: string; title: string; startsAt: string; status: BookingStatus; unpaid: boolean; paid: boolean;
    amountDueVnd: number; credits: number; packName: string | null; freeTrial: boolean; childNames: string[];
  }>;
  ledger: Array<{ at: string; kind: string; amount: number; reason: string; packName: string }>;
  hadFreeTrial: boolean;
}

export interface SessionType {
  id: string;
  kind: SessionKind;
  name: string;
  defaultMinutes: number;
  defaultCapacity: number | null;
  dropInPriceVnd: number | null;
  active: boolean;
  description: string | null;
}

export interface PackType {
  id: string;
  name: string;
  credits: number;
  priceVnd: number;
  validityMonths: number | null;
  validityDays: number | null;
  isIntro: boolean;
  onSale: boolean;
  coversSessionTypeIds: string[];
}

export interface NewSession {
  sessionTypeId: string;
  title: string;
  startsAt: string; // ISO
  minutes: number;
  capacity: number | null;
  instructorId: string | null;
  repeatUntil: string | null; // YYYY-MM-DD
  notes: string | null;
}

export interface StaffApi {
  me(): Promise<StaffMember | null>;
  instructors(): Promise<Array<{ userId: string; name: string }>>;
  sessionTypes(): Promise<SessionType[]>;
  packTypes(): Promise<PackType[]>;

  timetable(from: Date, to: Date): Promise<StaffSession[]>;
  session(id: string): Promise<StaffSession | null>;
  roster(sessionId: string): Promise<RosterRow[]>;
  contactList(): Promise<ContactItem[]>;
  markContacted(bookingId: string): Promise<void>;
  markAttendance(bookingId: string, status: "booked" | "attended" | "no_show"): Promise<void>;
  cancelBooking(bookingId: string, reason: string | null): Promise<BookingStatus>;
  restoreCredit(bookingId: string, reason: string): Promise<void>;
  /** Managers: move a customer's pack end date later (agreed rule: an expired pack can't be used; staff can extend). */
  extendPack(customerPackId: string, newLastDay: string, reason: string): Promise<void>;

  createSessions(s: NewSession): Promise<string[]>;
  updateSession(id: string, s: Omit<NewSession, "sessionTypeId" | "repeatUntil">): Promise<void>;
  cancelSession(id: string, reason: string): Promise<number>;

  searchCustomers(q: string): Promise<CustomerHit[]>;
  customer(id: string): Promise<CustomerProfile | null>;
  addCustomer(d: { fullName: string; phone: string; email: string | null; preferredContact: ContactMethod; children: Array<{ name: string; birthMonth: string }> }): Promise<string>;
  bookCustomer(d: { sessionId: string; customerId: string; childIds: string[]; unnamedChildren: number; parents: number; freeTrial: boolean; override: boolean }): Promise<string>;
  sellPack(d: { customerId: string; packTypeId: string; method: "qr" | "transfer" | "cash"; validFrom: string | null }): Promise<string>;
  recordPayment(d: { customerId: string; amountVnd: number; method: "qr" | "transfer" | "cash"; paidFor: "drop_in" | "private_hire" | "workshop" | "other"; bookingId: string | null; note: string | null }): Promise<void>;

  savePackType(p: Omit<PackType, "id"> & { id: string | null }): Promise<void>;
  saveSessionType(t: Omit<SessionType, "id"> & { id: string | null }): Promise<void>;
}
