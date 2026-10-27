import "server-only";
import { account } from "@/lib/data";

/**
 * The logged-in customer's active bookings, as session id → booking id, so the timetable can show
 * "Booked" instead of "Book" (change list #3). Empty when nobody is logged in. If loading fails the
 * timetable just shows "Book" as before (the booking itself still refuses a double booking).
 */
export async function myBookedSessions(): Promise<Map<string, string>> {
  try {
    const bookings = await account().myBookings();
    return new Map(bookings.filter((b) => b.status === "booked").map((b) => [b.session.id, b.id]));
  } catch (e) {
    console.error("Couldn't load the customer's bookings for the timetable", e);
    return new Map();
  }
}
