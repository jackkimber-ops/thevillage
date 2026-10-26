import * as Sentry from "@sentry/nextjs";
import { initBotId } from "botid/client/core";
import { sentryOptions } from "@/lib/sentry-options";

// Forms protected by BotID. Server actions post to the page they're on.
// On staff.thevillagesaigon.com the staff login page is at /login (rewritten to /staff/login).
// Only on Vercel (NEXT_PUBLIC_VERCEL_ENV is set there): elsewhere the BotID service can't be
// reached and its script holds up form posts. The server-side check is skipped off Vercel too.
if (process.env.NEXT_PUBLIC_VERCEL_ENV) {
  initBotId({
    protect: [
      { path: "/login", method: "POST" },
      { path: "/staff/login", method: "POST" },
      { path: "/classes/*/guest", method: "POST" },
    ],
  });
}

// Error tracking in the browser. Off until the DSN is set.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    ...sentryOptions,
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
