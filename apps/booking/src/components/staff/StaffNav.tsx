"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { StaffMember } from "@/lib/data/staff-types";
import { LINKS, MORE } from "@/lib/staff-links";


export function StaffNav({ me }: { me: StaffMember }) {
  const path = usePathname().replace(/^(?!\/staff)/, "/staff").replace(/\/$/, "") || "/staff";
  const current = (href: string) => (href === "/staff" ? path === "/staff" : path.startsWith(href));
  const visible = LINKS.filter((l) => !l.manager || me.role === "manager");
  return (
    <>
      <nav className="staff-side" aria-label="Staff menu">
        <div className="staff-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/wordmark-sky.png" alt="the village." width={140} height={65} />
          <div>Staff</div>
        </div>
        {visible.filter((l) => l.desk !== false).map((l) => (
          <Link key={l.href} className="staff-link" href={l.href} aria-current={current(l.href) ? "page" : undefined}>
            {l.label}{l.manager && <span className="staff-mgr">manager</span>}
          </Link>
        ))}
        <span className="staff-who">Signed in as {me.name} ({me.role === "manager" ? "Manager" : "Instructor"})</span>
      </nav>
      <nav className="staff-tabs" aria-label="Staff sections">
        {visible.filter((l) => l.phone).map((l) => (
          <Link key={l.href} className="tab" href={l.href} aria-current={current(l.href) ? "page" : undefined}>
            <span className="tab-dot" />{l.label}
          </Link>
        ))}
        {/* Phones: the manager pages sit behind More (team check, 3 Nov: they weren't reachable on a phone). */}
        {me.role === "manager" && (
          <Link className="tab" href="/staff/more" aria-current={["/staff/more", ...MORE.map((l) => l.href)].some(current) ? "page" : undefined}>
            <span className="tab-dot" />More
          </Link>
        )}
      </nav>
    </>
  );
}
