"use client";

import { useEffect } from "react";
import { clearBookingDrafts } from "@/lib/booking/drafts";

export function BookingDraftReset() {
  useEffect(() => {
    clearBookingDrafts();
  }, []);
  return null;
}
