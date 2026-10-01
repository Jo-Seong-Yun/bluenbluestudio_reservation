import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { publicImageUrl } from "@/lib/images";
import { resolveBookingStyle } from "@/lib/booking-style";
import { BookingRetryButton } from "@/components/booking-retry";
import { BookingProducts } from "@/components/booking-products";
import { BookingListViewTracker } from "./booking-list-view-tracker";
export const metadata: Metadata = { title: "예약하기" };
export default async function BookingPage() {
  const supabase = await createClient();
  const [{ data: products, error }, { data: settings }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, slug, summary, price, sale_price, cover_image, duration_min, max_people, tag_color",
      )
      .eq("is_published", true)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("settings")
      .select("show_product_thumbnails, booking_style")
      .eq("id", 1)
      .single(),
  ]);
  if (error)
    return (
      <main className="booking-page">
        <h1 className="text-2xl font-bold">상품 목록을 불러오지 못했습니다.</h1>
        <p role="alert" className="text-muted mt-3">
          잠시 후 다시 시도해 주시기 바랍니다.
        </p>
        <BookingRetryButton />
      </main>
    );
  return (
    <>
      <BookingListViewTracker />
      <BookingProducts
        products={(products ?? []).map((p) => ({
          ...p,
          imageUrl: p.cover_image ? publicImageUrl(p.cover_image) : null,
        }))}
        showThumbnails={settings?.show_product_thumbnails ?? true}
        style={resolveBookingStyle(settings?.booking_style)}
      />
    </>
  );
}
