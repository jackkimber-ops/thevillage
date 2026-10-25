import "server-only";
import { redirect } from "next/navigation";
import { account } from "@/lib/data";

/** For pages behind login: sends visitors to log in, and first-time users to "your details". */
export async function requireCustomer(next: string) {
  const acc = account();
  const user = await acc.user();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  const me = await acc.me();
  if (!me) redirect(`/welcome?next=${encodeURIComponent(next)}`);
  return me;
}
