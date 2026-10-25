import { staffError } from "@/lib/staff-errors";

/** Shows ?error=… or a success message from the URL. */
export function Notice({ error, ok }: { error?: string | string[]; ok?: string | null }) {
  if (typeof error === "string") return <p className="notice notice-error" role="alert">{staffError(error)}</p>;
  if (ok) return <p className="notice notice-ok" role="status">{ok}</p>;
  return null;
}
