// The staff app's pages, for the side menu (computer), the tab bar and the More page (phone).
export const LINKS = [
  { href: "/staff", label: "Dashboard", phone: true },
  { href: "/staff/today", label: "My sessions", phone: true, desk: false },
  { href: "/staff/calendar", label: "Calendar", phone: true },
  { href: "/staff/customers", label: "Customers", phone: true },
  { href: "/staff/catalog", label: "Catalog", manager: true },
  { href: "/staff/reports", label: "Reports", manager: true },
  { href: "/staff/team", label: "Staff", manager: true },
  { href: "/staff/settings", label: "Settings", manager: true },
];
/** The manager pages that don't fit in the phone tab bar. */
export const MORE = LINKS.filter((l) => l.manager);
