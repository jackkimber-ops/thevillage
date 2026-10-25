/** Only follow `next` to a path on this site (no open redirects). */
export function safeNext(next: unknown, fallback = "/classes"): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
