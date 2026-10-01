import "server-only";
import { createClient } from "@/lib/supabase/server";
import { readAllRevenueRows } from "./pagination";
import {
  REVENUE_STATUSES,
  summarizeRevenue,
  type RevenuePeriod,
} from "./summary";

export async function loadRevenueSummary(period: RevenuePeriod) {
  const supabase = await createClient();
  const [reservations, products, expenses] = await Promise.all([
    readAllRevenueRows((from, to) =>
      supabase
        .from("reservations")
        .select("id, status, product_id, shoot_start, charged_amount, cost", {
          count: "exact",
        })
        .gte("shoot_start", period.from)
        .lt("shoot_start", period.to)
        .in("status", REVENUE_STATUSES)
        .order("shoot_start")
        .order("id")
        .range(from, to),
    ),
    readAllRevenueRows((from, to) =>
      supabase
        .from("products")
        .select("id, name", { count: "exact" })
        .order("sort_order")
        .order("id")
        .range(from, to),
    ),
    readAllRevenueRows((from, to) =>
      supabase
        .from("monthly_expenses")
        .select("id, month, date, label, amount, memo, kind", {
          count: "exact",
        })
        .gte("month", period.startMonth)
        .lt("month", period.endMonth)
        .order("date")
        .order("id")
        .range(from, to),
    ),
  ]);
  return summarizeRevenue(period, reservations, products, expenses);
}
