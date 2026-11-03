import Link from "next/link";
import { MORE } from "@/lib/staff-links";
import { requireManager } from "@/lib/staff-guard";

const ABOUT: Record<string, string> = {
  "/staff/catalog": "Class types, prices and packs",
  "/staff/reports": "Money received by day and payment method",
  "/staff/team": "Who can log in to the staff app",
  "/staff/settings": "Studio details, booking rules, closures",
};

// Phones: the manager pages (on a computer they're in the side menu).
export default async function MorePage() {
  await requireManager();
  return (
    <>
      <h1 className="heading">more</h1>
      <div className="card menu-list">
        {MORE.map((l) => (
          <Link key={l.href} className="menu-item" href={l.href}>
            <span><strong>{l.label}</strong><br /><span className="muted small">{ABOUT[l.href]}</span></span>
            <span aria-hidden="true">›</span>
          </Link>
        ))}
      </div>
    </>
  );
}
