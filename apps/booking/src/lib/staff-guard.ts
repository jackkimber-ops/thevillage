import "server-only";
import { redirect } from "next/navigation";
import { account, staffApi, type StaffMember } from "@/lib/data";

/** Staff pages: log in first; a login without a staff role sees "not a staff account". */
export async function requireStaff(): Promise<StaffMember> {
  if (!(await account().user())) redirect("/staff/login");
  const me = await staffApi().me();
  if (!me) redirect("/staff/login?not_staff=1");
  return me;
}

export async function requireManager(): Promise<StaffMember> {
  const me = await requireStaff();
  if (me.role !== "manager") redirect("/staff?managers_only=1");
  return me;
}
