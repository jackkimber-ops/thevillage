"use client";

import { useSyncExternalStore } from "react";

// "Add to my calendar" for one booking (Jack, 3 Nov: it downloaded a file). Opens the person's own calendar
// with the class filled in: Google Calendar everywhere, Apple Calendar on iPhone, iPad and Mac (Safari shows
// "Add to Calendar" for the .ics, which is sent to open, not to download). One tap to save is as far as any
// website can go: calendars always ask first.

const noSubscribe = () => () => {};
const isApple = () => /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);

export function AddToCalendar({ google, apple, labels, compact = false }: {
  google: string;
  apple: string;
  labels: { google: string; apple: string };
  compact?: boolean;
}) {
  // The server doesn't know the device: Google only until the page has loaded, then Apple too on Apple devices.
  const apple_ = useSyncExternalStore(noSubscribe, isApple, () => false);
  const cls = compact ? "small-link" : "btn-secondary";
  return (
    <div className={compact ? "row add-cal-compact" : "add-cal"}>
      {apple_ && <a className={cls} href={apple}>{labels.apple}</a>}
      <a className={cls} href={google} target="_blank" rel="noopener noreferrer">{labels.google}</a>
    </div>
  );
}
