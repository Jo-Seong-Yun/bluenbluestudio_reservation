"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { recordAdminNavigation } from "@/app/admin/analytics-activity-actions";
const routes = new Set([
  "products",
  "reservations",
  "reservation-history",
  "customers",
  "revenue",
  "analytics",
  "schedule",
  "design",
  "emails",
  "settings",
]);
export function AdminAuditTracker() {
  const pathname = usePathname(),
    last = useRef<string | null>(null);
  useEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    const section = pathname.split("/")[2];
    const path = !section
      ? "/admin"
      : routes.has(section)
        ? `/admin/${section}`
        : "/admin/other";
    void recordAdminNavigation(path).catch(() => {});
  }, [pathname]);
  return null;
}
