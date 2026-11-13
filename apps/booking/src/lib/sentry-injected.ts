// Sentry, 10 and 13 Nov: errors from scripts that an in-app browser (Zalo, Facebook, …) or an extension adds to
// our pages. Their stack frames point at the page address itself (e.g. line 520 of "/"), but every page we
// send is one line of HTML and all our own code is in /_next/ files, so a frame like that can't be ours.

type Frame = { filename?: string; lineno?: number };
type SentryLikeEvent = { exception?: { values?: Array<{ stacktrace?: { frames?: Frame[] } }> } };

/** True when every frame of the error comes from a script added to the page, not from our code. */
export function fromInjectedScript(event: SentryLikeEvent): boolean {
  const values = event.exception?.values ?? [];
  const frames = values.flatMap((v) => v.stacktrace?.frames ?? []);
  if (frames.length === 0) return false;
  return frames.every((f) => Boolean(f.filename) && !f.filename!.includes("/_next/") && (f.lineno ?? 0) > 3);
}
