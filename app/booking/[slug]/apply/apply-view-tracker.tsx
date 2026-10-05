"use client";
import { BookingAnalyticsTracker } from "@/components/booking-analytics-tracker";
export function ApplyViewTracker({ productId }: { productId: string }) {
  return <BookingAnalyticsTracker stage="form_view" productId={productId} />;
}
