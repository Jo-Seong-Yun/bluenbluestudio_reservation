import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  loadAvailableDates,
  pickDefaultBookingMonth,
} from "@/lib/availability/load";
import type { AvailabilitySettings } from "@/lib/availability/slots";
import { BookingFlow } from "@/components/booking-flow";
import { Button } from "@/components/ui";
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
  const { month: monthParam } = await searchParams;

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
  const minMonth = today.slice(0, 7);
  const maxMonth = latestBookable.slice(0, 7);

  const requestedMonth = Array.isArray(monthParam) ? monthParam[0] : monthParam;
  const month =
    requestedMonth && requestedMonth >= minMonth && requestedMonth <= maxMonth
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
    // zoom을 쓰면 transform:scale과 달리 레이아웃 자체가 그 비율로
    // 다시 계산돼(주변 요소 크기·줄바꿈까지 실제로 줄어든다) — 그냥
    // 시각적으로 작아 보이기만 하는 게 아니라 화면에 실제로 더 많은
    // 내용이 들어온다. "화면이 너무 확대되어 보인다"는 건 넓은
    // 데스크톱 화면 얘기였으므로 lg 이상에서만 줄인다 — 모바일은 이미
    // 세로로 쌓이는 좁은 레이아웃이라 더 줄이면 달력 날짜 버튼 같은
    // 터치 영역만 작아지고 얻는 게 없다.
    <main className="mx-auto w-full max-w-[100rem] px-4 py-12 sm:px-6 lg:[zoom:90%]">
      <ProductViewTracker productId={product.id} />

      <Link href="/booking">
        <Button type="button" variant="ghost" className="text-boost">
          ← 상품 목록
        </Button>
      </Link>

      {/* 상세 설명은 손님 화면에서 뺐다(관리자 상품관리에는 그대로
          남아 있다). 설명이 없으면 왼쪽 칸이 제목·가격만 담은 채 비어
          보이므로, 상품 정보는 위쪽 한 줄 머리글로 올리고 예약 흐름이
          화면 폭 전체를 쓰게 한다. */}
      <div className="mt-6 flex max-w-5xl flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-boost text-2xl font-bold">{product.name}</h1>
          {product.page_summary ? (
            <p className="text-muted text-boost mt-1.5 max-w-2xl text-sm whitespace-pre-line sm:text-base">
              {product.page_summary}
            </p>
          ) : null}
          <p className="text-muted text-boost mt-1 text-xs">
            {earliestBookable} 부터 {latestBookable} 까지 예약할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
          {product.sale_price != null ? (
            <div className="flex flex-col items-end gap-0">
              <div className="text-muted flex items-center gap-1.5">
                <span className="text-boost text-xs line-through">
                  {product.price.toLocaleString()}원
                </span>
                <span className="text-boost rounded-md bg-rose-50 px-1 py-0.5 text-xs font-bold text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                  {Math.round((1 - product.sale_price / product.price) * 100)}%
                </span>
              </div>
              <span className="text-foreground text-boost text-xl font-extrabold">
                {product.sale_price.toLocaleString()}원
              </span>
            </div>
          ) : (
            <span className="text-boost text-xl font-extrabold">
              {product.price.toLocaleString()}원
            </span>
          )}
          {product.max_people ? (
            <span className="text-muted text-boost">
              · 최대 {product.max_people}명
            </span>
          ) : null}
        </div>
      </div>

      <div className="border-brand/30 bg-brand/5 mt-5 max-w-5xl rounded-xl border px-4 py-3">
        <p className="text-boost text-sm leading-relaxed sm:text-base">
          먼저 희망하는 시간 3개를 선택하면, 푸르른 스튜디오가 3개 중 1개의
          일정으로 확정해드립니다.
        </p>
      </div>

      <div className="mt-4">
        <BookingFlow
          productId={product.id}
          month={month}
          availableDates={[...availableDates]}
          basePath={`/booking/${slug}`}
          minMonth={minMonth}
          maxMonth={maxMonth}
        />
      </div>
    </main>
  );
}
