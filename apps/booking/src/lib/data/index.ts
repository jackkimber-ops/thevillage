import "server-only";
import { hasSupabase } from "@/lib/supabase/server";
import { demoAccount } from "./demo-account";
import { demoData } from "./demo";
import { demoStaff } from "./demo-staff";
import { supabaseAccount } from "./supabase-account";
import { supabaseData } from "./supabase";
import { supabaseStaff } from "./supabase-staff";
import type { Account, DataSource } from "./types";
import type { StaffApi } from "./staff-types";

function isDemo(): boolean {
  if (hasSupabase()) return false;
  if (process.env.DEMO_DATA === "1") return true;
  throw new Error("No database configured: set the Supabase environment variables (see .env.example).");
}

/** Public information: settings and the timetable. */
export function data(): DataSource {
  return isDemo() ? demoData : supabaseData;
}

/** The logged-in customer's account, bookings and packs. */
export function account(): Account {
  return isDemo() ? demoAccount : supabaseAccount;
}

/** The staff app: everything is checked again by the database (row-level security and functions). */
export function staffApi(): StaffApi {
  return isDemo() ? demoStaff : supabaseStaff;
}

export * from "./types";
export * from "./staff-types";
