import { describe, expect, it } from "vitest";
import { fromInjectedScript } from "./sentry-injected";

const ev = (frames: Array<{ filename?: string; lineno?: number }>) => ({ exception: { values: [{ stacktrace: { frames } }] } });

describe("errors from scripts added to the page (Sentry, 13 Nov)", () => {
  it("drops an error whose frames are all deep inside the page address", () => {
    expect(fromInjectedScript(ev([
      { filename: "https://book.thevillagesaigon.com/", lineno: 199 },
      { filename: "https://book.thevillagesaigon.com/", lineno: 198 },
      { filename: "https://book.thevillagesaigon.com/", lineno: 520 },
    ]))).toBe(true);
  });

  it("keeps anything with one of our own /_next/ files in it", () => {
    expect(fromInjectedScript(ev([
      { filename: "https://book.thevillagesaigon.com/", lineno: 520 },
      { filename: "https://book.thevillagesaigon.com/_next/static/immutable/chunks/2_i1zsxm3rlc8.js", lineno: 2 },
    ]))).toBe(false);
  });

  it("keeps errors on the first lines of a page and errors with no stack", () => {
    expect(fromInjectedScript(ev([{ filename: "https://book.thevillagesaigon.com/classes/x", lineno: 1 }]))).toBe(false);
    expect(fromInjectedScript(ev([]))).toBe(false);
    expect(fromInjectedScript({})).toBe(false);
  });
});
