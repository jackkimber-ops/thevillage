"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Reloads the page's data every `seconds` while the tab is showing (the dashboard's latest bookings, change #49). */
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => { if (document.visibilityState === "visible") router.refresh(); };
    const id = window.setInterval(tick, seconds * 1000);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [router, seconds]);
  return null;
}
