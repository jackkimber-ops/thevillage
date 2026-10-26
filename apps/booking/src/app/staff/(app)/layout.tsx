import { StaffNav } from "@/components/staff/StaffNav";
import { requireStaff } from "@/lib/staff-guard";

// Staff app shell: side menu on a computer, tabs along the bottom on a phone. English only.
export default async function StaffLayout({ children }: LayoutProps<"/staff">) {
  const me = await requireStaff();
  return (
    <div className="staff" lang="en">
      <StaffNav me={me} />
      <main className="staff-main">{children}</main>
    </div>
  );
}
