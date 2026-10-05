import type { Metadata } from "next";
import { loadProductAnalytics } from "@/lib/product-analytics";
import { AnalyticsDashboard } from "./analytics-dashboard";
export const metadata: Metadata = { title: "통계" };
export default async function AnalyticsPage() {
  return <AnalyticsDashboard data={await loadProductAnalytics(14)} />;
}
