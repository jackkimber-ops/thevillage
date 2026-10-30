import "server-only";

// Studio details come from the booking database's studio_settings (one row, readable by anyone),
// never from the website's code. Refreshed at most once an hour.
export interface Studio {
  name: string;
  address: string;
  openingHours: string;
  contactEmail: string;
  whatsappUrl: string | null;
  zaloUrl: string | null;
  messengerUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  mapsUrl: string | null;
  contactPhone: string;
}

// DEMO values for local development and tests only (DEMO_DATA=1, no database configured).
const demo: Studio = {
  name: "The Village - Family Club",
  address: "47/1 Quốc Hương, An Khánh, Hồ Chí Minh",
  openingHours: "Every day 8:30–17:00",
  contactEmail: "thevillage.saigon@gmail.com",
  contactPhone: "+84933834068",
  whatsappUrl: "https://wa.me/84933834068",
  zaloUrl: "https://zalo.me/0933834068",
  messengerUrl: "https://m.me/thevillage.saigon",
  facebookUrl: "https://www.facebook.com/thevillage.saigon",
  instagramUrl: "https://www.instagram.com/thevillage.saigon",
  mapsUrl: "https://maps.app.goo.gl/shhU5KCEVMMrX4cd8",
};

export async function studio(): Promise<Studio> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (process.env.DEMO_DATA === "1") return demo;
    throw new Error("No database configured: set the Supabase environment variables (see .env.example).");
  }
  const res = await fetch(`${url}/rest/v1/studio_settings?select=*`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Couldn't load studio settings (${res.status})`);
  const [s] = await res.json();
  return {
    name: s.name, address: s.address, openingHours: s.opening_hours, contactEmail: s.contact_email, contactPhone: s.contact_phone,
    whatsappUrl: s.whatsapp_url, zaloUrl: s.zalo_url, messengerUrl: s.messenger_url, facebookUrl: s.facebook_url,
    instagramUrl: s.instagram_url, mapsUrl: s.maps_url,
  };
}

/** Where every Book button goes: the booking site (book.thevillagesaigon.com). */
/** A link into the booking site, in the website's language (it sets the booking site's language too). */
export function bookingUrl(path = "", locale?: string) {
  const base = `${process.env.NEXT_PUBLIC_BOOKING_URL ?? "https://book.thevillagesaigon.com"}${path}`;
  return locale ? `${base}${path.includes("?") ? "&" : "?"}lang=${locale}` : base;
}
