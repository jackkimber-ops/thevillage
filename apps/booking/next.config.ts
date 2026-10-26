import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import { withBotId } from "botid/next/config";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {};

// Source maps go to Sentry at build time (so errors show readable code), then are deleted from the
// build so they're never published. Only on Vercel, where SENTRY_AUTH_TOKEN is set; skipped locally
// and in CI. A failed upload only warns: it never stops a release.
export default withSentryConfig(withBotId(withNextIntl(nextConfig)), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  telemetry: false,
  silent: !process.env.CI && !process.env.VERCEL,
  errorHandler: (err) => console.warn("Sentry source map upload failed; the build continues.", err),
});
