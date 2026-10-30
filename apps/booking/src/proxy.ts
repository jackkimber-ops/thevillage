import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routeForHost } from "@/lib/hosts";
import { LOCALE_COOKIE } from "@/i18n/locales";

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname, search } = request.nextUrl;

  // ?lang=vi or ?lang=en (the website's Book buttons): remember that language, then show the page without it.
  const lang = request.nextUrl.searchParams.get("lang");
  if (lang === "vi" || lang === "en") {
    const url = request.nextUrl.clone();
    url.searchParams.delete("lang");
    const res = NextResponse.redirect(url);
    res.cookies.set(LOCALE_COOKIE, lang, { path: "/", maxAge: 31536000, sameSite: "lax" });
    return res;
  }
  const route = routeForHost(host, pathname, search);
  if (route.action === "redirect") return NextResponse.redirect(route.url);

  const build = () => {
    if (route.action === "rewrite") {
      const url = request.nextUrl.clone();
      url.pathname = route.path;
      return NextResponse.rewrite(url, { request });
    }
    return NextResponse.next({ request });
  };
  let response = build();

  // Keep the Supabase login fresh (refreshes the session cookies when needed).
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = build();
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    await supabase.auth.getUser();
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[a-z0-9]+$).*)"],
};
