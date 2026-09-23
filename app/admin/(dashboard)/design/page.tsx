import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { resolveBookingStyle } from "@/lib/booking-style";
import { DesignForm } from "./design-form";

export const metadata: Metadata = { title: "예약 페이지 디자인" };
export const dynamic = "force-dynamic";

export default async function DesignPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("booking_style")
    .eq("id", 1)
    .single();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">예약 페이지 디자인</h1>
      <DesignForm initial={resolveBookingStyle(settings?.booking_style)} />
    </div>
  );
}
