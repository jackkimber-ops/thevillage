// Health check for the uptime monitor. The database check is added in stage 4.
export function GET() {
  return Response.json({ status: "ok", time: new Date().toISOString() });
}
