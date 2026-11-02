"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";

// Team feedback (29 Oct): going to the menu, or to Bookings/Packages, and back shouldn't lose your place.
// The last timetable view and the page before the menu are kept for this visit (sessionStorage).
const CLASSES = "village:classes-view";
const BEFORE_MENU = "village:before-menu";
const MOVED = "village:moved";

function read(key: string): string | null {
  try {
    const v = sessionStorage.getItem(key);
    return v && v.startsWith("/") && !v.startsWith("//") ? v : null;
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // private mode etc.: links just use their defaults
  }
}

const noSubscribe = () => () => {};
/** A remembered address, read after the page has loaded (the server always renders the default). */
function useRemembered(key: string, fallback: string, ok: (v: string) => boolean = () => true) {
  return useSyncExternalStore(noSubscribe, () => { const v = read(key); return v && ok(v) ? v : fallback; }, () => fallback);
}

/** On the timetable: remember this exact view (week, month, filter). */
export function RememberClassesView({ url }: { url: string }) {
  useEffect(() => write(CLASSES, url), [url]);
  return null;
}

/** The Classes tab: back to the week you were looking at. */
export function ClassesTabLink(props: Omit<React.ComponentProps<typeof Link>, "href">) {
  return <Link {...props} href={useRemembered(CLASSES, "/classes")} />;
}

/** The menu button (or any link to the menu, e.g. "Questions about this class"): remembers the page you opened it from. */
export function MenuLink({ hash, ...props }: Omit<React.ComponentProps<typeof Link>, "href" | "onClick"> & { hash?: string }) {
  return <Link {...props} href={hash ? `/menu#${hash}` : "/menu"} onClick={() => write(BEFORE_MENU, window.location.pathname + window.location.search)} />;
}

/** In the root layout: notes that this visit has moved between pages, so Back can use the browser's history. */
export function TrackMoves() {
  const path = usePathname();
  const first = useRef(path);
  useEffect(() => {
    if (path !== first.current) write(MOVED, "/");
  }, [path]);
  return null;
}

/**
 * Back on pages reached from several places (privacy, terms, hire, my details): the page you came from
 * (team feedback 2 Nov: privacy from the booking form went back to the menu). Opened straight from a link
 * outside the site, it goes to `href` instead.
 */
export function BackLink(props: React.ComponentProps<typeof Link>) {
  const router = useRouter();
  return (
    <Link
      {...props}
      onClick={(e) => {
        if (read(MOVED) && window.history.length > 1) {
          e.preventDefault();
          router.back();
        }
      }}
    />
  );
}

/** The menu's close button: back to that page. */
export function MenuCloseLink(props: Omit<React.ComponentProps<typeof Link>, "href">) {
  return <Link {...props} href={useRemembered(BEFORE_MENU, "/classes", (v) => !v.startsWith("/menu"))} />;
}
