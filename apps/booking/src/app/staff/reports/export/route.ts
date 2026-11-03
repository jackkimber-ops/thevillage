import { staffApi } from "@/lib/data";
import { monthOf, monthRange, toCsv } from "@/lib/money-report";
import { vnDateKey } from "@/lib/time";

// M3: the month's payments as a spreadsheet (CSV). Managers only (the database refuses anyone else too).
export async function GET(request: Request) {
  const me = await staffApi().me();
  if (me?.role !== "manager") return new Response("Managers only", { status: 403 });
  const month = monthOf(new URL(request.url).searchParams.get("month") ?? undefined, vnDateKey(new Date()));
  const { from, to } = monthRange(month);
  const csv = toCsv(await staffApi().moneyReport(from, to));
  return new Response(`﻿${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="the-village-payments-${month}.csv"`,
      "cache-control": "no-store",
    },
  });
}
