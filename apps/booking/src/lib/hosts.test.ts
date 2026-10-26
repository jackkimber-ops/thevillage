import { describe, expect, it } from "vitest";
import { routeForHost } from "./hosts";

describe("routeForHost", () => {
  it("serves the customer site as-is on book.", () => {
    expect(routeForHost("book.thevillagesaigon.com", "/")).toEqual({ action: "next" });
    expect(routeForHost("book.thevillagesaigon.com", "/classes")).toEqual({ action: "next" });
  });

  it("sends /staff on book. to the staff host", () => {
    expect(routeForHost("book.thevillagesaigon.com", "/staff/calendar", "?d=1")).toEqual({
      action: "redirect",
      url: "https://staff.thevillagesaigon.com/calendar?d=1",
    });
  });

  it("rewrites staff. paths into /staff", () => {
    expect(routeForHost("staff.thevillagesaigon.com", "/")).toEqual({ action: "rewrite", path: "/staff" });
    expect(routeForHost("staff.thevillagesaigon.com", "/calendar")).toEqual({
      action: "rewrite",
      path: "/staff/calendar",
    });
  });

  it("removes a doubled /staff on staff.", () => {
    expect(routeForHost("staff.thevillagesaigon.com", "/staff/calendar")).toEqual({
      action: "redirect",
      url: "https://staff.thevillagesaigon.com/calendar",
    });
  });

  it("leaves API routes alone on every host", () => {
    expect(routeForHost("staff.thevillagesaigon.com", "/api/health")).toEqual({ action: "next" });
  });

  it("serves both sites on previews and localhost", () => {
    expect(routeForHost("localhost:3000", "/staff")).toEqual({ action: "next" });
    expect(routeForHost("thevillage-git-x.vercel.app", "/")).toEqual({ action: "next" });
  });
});
