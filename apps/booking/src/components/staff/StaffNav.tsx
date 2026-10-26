"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { StaffMember } from "@/lib/data/staff-types";

const LINKS = [
  { href: "/staff", label: "Dashboard", phone: true },
  { href: "/staff/today", label: "My sessions", phone: true, desk: false },
  { href: "/staff/calendar", label: "Calendar", phone: true },
  { href: "/staff/customers", label: "Customers", phone: true },
  { href: "/staff/catalog", label: "Catalog", manager: true },
];
const LATER = ["Reports", "Staff", "Settings"];

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
        {me.role === "manager" && LATER.map((l) => (
          <span key={l} className="staff-link staff-later" title="Coming in the +1 month release">{l}<span className="staff-mgr">+1 month</span></span>
        ))}
        <span className="staff-who">Signed in as {me.name} ({me.role === "manager" ? "Manager" : "Instructor"})</span>
      </nav>
      <nav className="staff-tabs" aria-label="Staff sections">
        {visible.filter((l) => l.phone).map((l) => (
          <Link key={l.href} className="tab" href={l.href} aria-current={current(l.href) ? "page" : undefined}>
            <span className="tab-dot" />{l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
