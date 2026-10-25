"use client";

import { staffError } from "@/lib/staff-errors";

export function StaffFormError({ code }: { code?: string }) {
  return code ? <p className="notice notice-error" role="alert">{staffError(code)}</p> : null;
}
