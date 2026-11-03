import { describe, expect, it, vi } from "vitest";
import { neverConnected, retryFetch } from "./retry-fetch";

const fail = (code: string) => Object.assign(new TypeError("fetch failed"), { cause: { code } });
// As in the Sentry report: two addresses tried, both timed out.
const failBoth = () => Object.assign(new TypeError("fetch failed"), { cause: { errors: [{ code: "UND_ERR_CONNECT_TIMEOUT" }, { code: "UND_ERR_CONNECT_TIMEOUT" }] } });

describe("retryFetch", () => {
  it("tries once more when the connection never opened", async () => {
    const base = vi.fn().mockRejectedValueOnce(fail("UND_ERR_CONNECT_TIMEOUT")).mockResolvedValueOnce(new Response("ok"));
    const res = await retryFetch(base as unknown as typeof fetch)("https://x.supabase.co/rest/v1/sessions", { method: "POST", body: "{}" });
    expect(await res.text()).toBe("ok");
    expect(base).toHaveBeenCalledTimes(2);
  });

  it("gives up after the second try", async () => {
    const base = vi.fn().mockRejectedValue(failBoth());
    await expect(retryFetch(base as unknown as typeof fetch)("https://x")).rejects.toThrow("fetch failed");
    expect(base).toHaveBeenCalledTimes(2);
  });

  it("never retries once the request may have reached the database", async () => {
    const base = vi.fn().mockRejectedValue(fail("ECONNRESET"));
    await expect(retryFetch(base as unknown as typeof fetch)("https://x", { method: "POST" })).rejects.toThrow();
    expect(base).toHaveBeenCalledTimes(1);
  });

  it("recognises connect failures, including several addresses", () => {
    expect(neverConnected(failBoth())).toBe(true);
    expect(neverConnected(fail("ENOTFOUND"))).toBe(true);
    expect(neverConnected(fail("UND_ERR_SOCKET"))).toBe(false);
    expect(neverConnected(new Error("other"))).toBe(false);
  });
});
