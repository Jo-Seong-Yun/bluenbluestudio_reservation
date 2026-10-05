"use client";
import { useEffect, useRef } from "react";
import { trackBooking, flushAnalytics } from "@/lib/analytics/client";
export function BookingAnalyticsTracker({
  stage,
  productId,
}: {
  stage: "list_view" | "detail_view" | "times_view" | "form_view";
  productId?: string;
}) {
  const logged = useRef<string | null>(null);
  useEffect(() => {
    const key = `${stage}:${productId ?? ""}`;
    if (logged.current !== key) {
      logged.current = key;
      trackBooking(stage, productId);
    }
    const flush = () => flushAnalytics();
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [stage, productId]);
  return null;
}
