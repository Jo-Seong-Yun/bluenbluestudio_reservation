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
    const visibility = () => {
      if (productId)
        trackBooking("visibility_change", productId, {
          details: {
            visibility:
              document.visibilityState === "hidden" ? "hidden" : "visible",
          },
        });
      flushAnalytics();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      flushAnalytics();
    };
  }, [stage, productId]);
  return null;
}
