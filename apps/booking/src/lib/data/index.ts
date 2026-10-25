import "server-only";
import { hasSupabase } from "@/lib/supabase/server";
import { demoAccount } from "./demo-account";
import { demoData } from "./demo";
import { supabaseAccount } from "./supabase-account";
import { supabaseData } from "./supabase";
import type { Account, DataSource } from "./types";

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

export * from "./types";
