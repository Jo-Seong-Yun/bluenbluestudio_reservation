"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { clearBookingDrafts } from "@/lib/booking/drafts";

export function BookingDraftReset() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === "/booking") clearBookingDrafts();
  }, [pathname]);
  return null;
}
