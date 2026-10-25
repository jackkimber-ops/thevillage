import Link from "next/link";
import { CustomerForm } from "@/components/staff/CustomerForm";
import { requireStaff } from "@/lib/staff-guard";

// S14 Add a new customer (staff), e.g. someone walking in or messaging.
export default async function NewCustomer({ searchParams }: PageProps<"/staff/customers/new">) {
  const sp = await searchParams;
  await requireStaff();
  const next = typeof sp.next === "string" && sp.next.startsWith("/staff") ? sp.next : "";
  return (
    <>
      <Link href="/staff/customers" className="small-link">← Customers</Link>
      <h1 className="heading">add a new customer</h1>
      <CustomerForm next={next} />
    </>
  );
}
