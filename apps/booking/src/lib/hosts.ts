// One app serves two sites, chosen by hostname:
//   book.thevillagesaigon.com  -> customer site (routes at /)
//   staff.thevillagesaigon.com -> staff app (routes under /staff)
// Any other host (localhost, Vercel previews) serves both, with the staff app at /staff.

export type HostRoute =
  | { action: "next" }
  | { action: "rewrite"; path: string }
  | { action: "redirect"; url: string };

const STAFF_PREFIX = "/staff";

function isStaffPath(pathname: string): boolean {
  return pathname === STAFF_PREFIX || pathname.startsWith(`${STAFF_PREFIX}/`);
}

function stripStaff(pathname: string): string {
  return pathname.slice(STAFF_PREFIX.length) || "/";
}

export function routeForHost(host: string, pathname: string, search = ""): HostRoute {
  const hostname = host.split(":")[0].toLowerCase();

  if (pathname.startsWith("/api/")) return { action: "next" };

  if (hostname.startsWith("staff.")) {
    if (isStaffPath(pathname)) {
      return { action: "redirect", url: `https://${host}${stripStaff(pathname)}${search}` };
    }
    return { action: "rewrite", path: `${STAFF_PREFIX}${pathname === "/" ? "" : pathname}` };
  }

  if (hostname.startsWith("book.") && isStaffPath(pathname)) {
    const staffHost = `staff.${host.slice("book.".length)}`;
    return { action: "redirect", url: `https://${staffHost}${stripStaff(pathname)}${search}` };
  }

  return { action: "next" };
}
