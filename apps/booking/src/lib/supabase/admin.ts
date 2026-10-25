import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Service-role client for server-only work that has no logged-in user (guest bookings). Never send it to the browser. */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
