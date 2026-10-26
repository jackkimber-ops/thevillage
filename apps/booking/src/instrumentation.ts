import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry-options";

// Error tracking (Sentry, free plan). Does nothing until NEXT_PUBLIC_SENTRY_DSN is set.
export function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({ ...sentryOptions, dsn, environment: process.env.VERCEL_ENV ?? "development" });
}

export const onRequestError = Sentry.captureRequestError;
