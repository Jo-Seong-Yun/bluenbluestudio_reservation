import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  loadAvailableDates,
  pickDefaultBookingMonth,
} from "@/lib/availability/load";
import type { AvailabilitySettings } from "@/lib/availability/slots";
import { BookingDetail } from "@/components/booking-detail";
import { BookingFlow } from "@/components/booking-flow";
import { addDays, kstToday, monthGridDates } from "@/lib/time";
import { ProductViewTracker } from "./product-view-tracker";

export async function generateMetadata({
  params,
}: PageProps<"/booking/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("name")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  return { title: product?.name ?? "상품을 찾을 수 없습니다" };
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: PageProps<"/booking/[slug]">) {
  const { slug } = await params;
  const { month: monthParam, step } = await searchParams;

  const supabase = await createClient();
  const [{ data: product }, { data: settings }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle(),
    supabase
      .from("settings")
      .select("slot_interval_min, min_lead_days, max_advance_days")
      .eq("id", 1)
      .single(),
  ]);

  if (!product) notFound();

  const availabilitySettings: AvailabilitySettings = {
    slotIntervalMin: settings?.slot_interval_min ?? 60,
    minLeadDays: settings?.min_lead_days ?? 1,
    maxAdvanceDays: settings?.max_advance_days ?? 60,
  };

  const today = kstToday();
  const earliestBookable = addDays(today, availabilitySettings.minLeadDays);
  const latestBookable = addDays(today, availabilitySettings.maxAdvanceDays);
  const isTimes = (Array.isArray(step) ? step[0] : step) === "times";
  // 상품 설명을 읽는 단계에서는 달력 전체 조회를 기다릴 필요가 없다.
  if (!isTimes)
    return (
      <>
        <ProductViewTracker productId={product.id} />
        <BookingDetail
          product={product}
          earliestBookable={earliestBookable}
          latestBookable={latestBookable}
        />
      </>
    );
  const minMonth = today.slice(0, 7);
  const maxMonth = latestBookable.slice(0, 7);

  const requestedMonth = Array.isArray(monthParam) ? monthParam[0] : monthParam;
  const month =
    requestedMonth &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth) &&
    requestedMonth >= minMonth &&
    requestedMonth <= maxMonth
      ? requestedMonth
      : await pickDefaultBookingMonth({
          productId: product.id,
          today,
          maxMonth,
          settings: availabilitySettings,
        });

  const grid = monthGridDates(month);
  const availableDates = await loadAvailableDates({
    productId: product.id,
    from: grid[0],
    to: grid[grid.length - 1],
    settings: availabilitySettings,
  });

  return (
    <>
      <ProductViewTracker productId={product.id} />

      <main className="booking-page">
        <Link
          href={`/booking/${slug}`}
          className="text-muted mb-4 inline-block text-sm"
        >
          ← 상품 상세
        </Link>

        <BookingFlow
          productId={product.id}
          productName={product.name}
          basePrice={product.sale_price ?? product.price}
          durationMin={product.duration_min}
          month={month}
          availableDates={[...availableDates]}
          basePath={`/booking/${slug}`}
          minMonth={minMonth}
          maxMonth={maxMonth}
        />
      </main>
    </>
  );
}
