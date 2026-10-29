"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

// Team feedback (29 Oct): going to the menu, or to Bookings/Packages, and back shouldn't lose your place.
// The last timetable view and the page before the menu are kept for this visit (sessionStorage).
const CLASSES = "village:classes-view";
const BEFORE_MENU = "village:before-menu";

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

/** The menu button: remembers the page you opened it from. */
export function MenuLink(props: Omit<React.ComponentProps<typeof Link>, "href" | "onClick">) {
  return <Link {...props} href="/menu" onClick={() => write(BEFORE_MENU, window.location.pathname + window.location.search)} />;
}

/** The menu's close button: back to that page. */
export function MenuCloseLink(props: Omit<React.ComponentProps<typeof Link>, "href">) {
  return <Link {...props} href={useRemembered(BEFORE_MENU, "/classes", (v) => !v.startsWith("/menu"))} />;
}
