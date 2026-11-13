import * as Sentry from "@sentry/nextjs";
import { initBotId } from "botid/client/core";
import { sentryOptions } from "@/lib/sentry-options";
import { fromInjectedScript } from "@/lib/sentry-injected";

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
    // Sentry, 10 Nov: pages opened inside the Zalo app on iPhone get Zalo's own script added, which
    // fails with "Can't find variable: zaloJSV2". Not our code, and the page still works.
    ignoreErrors: [/zaloJSV2/],
    // Sentry, 13 Nov ("Error: Na" at line 520 of the page): scripts an app or extension adds to our pages.
    beforeSend: (event) => (fromInjectedScript(event) ? null : event),
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
