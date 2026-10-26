import { data } from "@/lib/data";

export const dynamic = "force-dynamic";

// Health check for the uptime monitor: the app is up and can read from the database.
export async function GET() {
  const time = new Date().toISOString();
  try {
    await data().settings();
    return Response.json({ status: "ok", database: "ok", time });
  } catch (e) {
    console.error("Health check: database not reachable", e);
    return Response.json({ status: "error", database: "error", time }, { status: 503 });
  }
}
