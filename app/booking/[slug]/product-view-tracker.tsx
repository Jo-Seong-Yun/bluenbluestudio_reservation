"use client";
import { BookingAnalyticsTracker } from "@/components/booking-analytics-tracker";
export function ProductViewTracker({
  productId,
  stage = "detail_view",
}: {
  productId: string;
  stage?: "detail_view" | "times_view";
}) {
  return <BookingAnalyticsTracker stage={stage} productId={productId} />;
}
