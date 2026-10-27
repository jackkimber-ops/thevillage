import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { linkGuestRecord } from "@/lib/data/supabase-account";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

// The one-tap link under the code in the login email.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") ?? "email") as EmailOtpType;
  const next = safeNext(url.searchParams.get("next"));
  if (tokenHash) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      // Same as the code login: staff go straight to the staff app; customers fill in their details once.
      // (Never look up "my customer" without the user id: staff can read every customer.)
      if (next.startsWith("/staff")) return NextResponse.redirect(new URL(next, url.origin));
      await linkGuestRecord(supabase);
      const { data: auth } = await supabase.auth.getUser();
      const { data: me } = await supabase.from("customers").select("id").eq("user_id", auth.user?.id ?? "").maybeSingle();
      return NextResponse.redirect(new URL(me ? next : `/welcome?next=${encodeURIComponent(next)}`, url.origin));
    }
  }
  return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}&expired=1`, url.origin));
}
