import { NextResponse, type NextRequest } from "next/server";
import { routeForHost } from "@/lib/hosts";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname, search } = request.nextUrl;
  const route = routeForHost(host, pathname, search);

  if (route.action === "redirect") return NextResponse.redirect(route.url);
  if (route.action === "rewrite") {
    const url = request.nextUrl.clone();
    url.pathname = route.path;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[a-z0-9]+$).*)"],
};
