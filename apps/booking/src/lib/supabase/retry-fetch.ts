// Sentry (29 Oct and 3 Nov): now and then the server can't even open a connection to Supabase
// ("ConnectTimeoutError", 10 s), and the page fails. When the connection never opened, nothing reached
// the database, so trying once more is safe for every request, bookings included.
// Errors after the connection opened (the request may have arrived) are never retried.

const NEVER_CONNECTED = new Set(["UND_ERR_CONNECT_TIMEOUT", "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN"]);

/** True when fetch failed before a connection to the server was made. */
export function neverConnected(e: unknown): boolean {
  const cause = (e as { cause?: unknown } | null)?.cause as { code?: string; errors?: Array<{ code?: string }> } | undefined;
  if (!cause) return false;
  if (cause.code && NEVER_CONNECTED.has(cause.code)) return true;
  // Several addresses tried (as in the Sentry report): every one of them must have failed to connect.
  return Array.isArray(cause.errors) && cause.errors.length > 0 && cause.errors.every((x) => Boolean(x.code && NEVER_CONNECTED.has(x.code)));
}

/** `fetch` for the Supabase clients: one more try, half a second later, if the connection never opened. */
export function retryFetch(base: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    try {
      return await base(input, init);
    } catch (e) {
      if (!neverConnected(e) || init?.signal?.aborted) throw e;
      await new Promise((r) => setTimeout(r, 500));
      return base(input, init);
    }
  };
}
