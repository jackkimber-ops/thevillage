import "server-only";
import { hasSupabase } from "@/lib/supabase/server";
import { demoData } from "./demo";
import { supabaseData } from "./supabase";
import type { DataSource } from "./types";

export function data(): DataSource {
  if (hasSupabase()) return supabaseData;
  if (process.env.DEMO_DATA === "1") return demoData;
  throw new Error("No database configured: set the Supabase environment variables (see .env.example).");
}

export type * from "./types";
