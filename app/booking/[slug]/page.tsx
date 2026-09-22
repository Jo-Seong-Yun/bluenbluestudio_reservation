import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  loadAvailableDates,
  pickDefaultBookingMonth,
} from "@/lib/availability/load";
import type { AvailabilitySettings } from "@/lib/availability/slots";
import { RichText } from "@/components/rich-text";
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

      {/* 왼쪽엔 타이틀·가격 + 상세 내용을 한 박스 안에 담고, 오른쪽엔
          달력·시간 선택. 좁은 화면에서는 전체가 위아래로 쌓인다(제목→
          설명→예약 흐름 순서로 읽히도록). 예약 흐름 쪽(BookingFlow)이
          달력 + 그 옆 시간 선택 칸을 나란히 두려면 꽤 넓은 폭이
          필요해서, 왼쪽과 나란히 두는 기준을 2xl(넓은 데스크톱)로
          높여뒀다 — 그보다 좁으면 예약 흐름에게 화면 전체 폭을 내줘야
          달력이 찌그러지지 않는다. flex 대신 grid를 쓴다 — 왼쪽 칸을
          28rem "고정 트랙"으로 못박아 두면, 그 안의 글자가 아무리
          길어도 트랙 자체가 늘어나는 일은 없다(flex의 width는
          min-content가 크면 그보다 더 넓어질 수 있어 옆 칸(달력)을
          침범할 수 있었다 — grid의 명시적 트랙 크기는 그런 식으로
          밀리지 않는다). min-w-0은 각 칸 내부 콘텐츠가 트랙 폭 안에서
          실제로 줄바꿈되도록 하는 안전장치로 그대로 둔다. items-start라
          어느 한쪽 칼럼이 더 높아져도 서로 늘어나지 않고, 각자 자기
          칸 맨 위에서 시작해 상단이 그대로 맞는다. */}
      <div className="mt-6 grid grid-cols-1 gap-6 2xl:grid-cols-[28rem_minmax(0,1fr)] 2xl:items-start">
        <div className="min-w-0">
          {/* 박스를 둘로 쪼개지 않고 하나로 두되, 안에서 제목/가격 영역과
              상세 내용 영역을 얇은 구분선(border-t)으로만 나눈다 —
              "박스 안에 또 박스"가 겹치는 느낌 없이 자연스럽게 이어진다. */}
          <div className="border-border bg-surface rounded-xl border">
            <div className="p-3 sm:p-5">
              <h1 className="text-boost text-2xl font-bold">{product.name}</h1>
              <p className="text-muted text-boost mt-1 text-xs">
                {earliestBookable} 부터 {latestBookable} 까지 예약할 수 있습니다.
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
                {product.sale_price != null ? (
                  <div className="flex flex-col gap-0">
                    {/* 정가·할인율은 할인가 위에 작게, 행간을 좁혀서
                        (gap-0) 할인가 한 덩어리처럼 보이게 한다. */}
                    <div className="text-muted flex items-center gap-1.5">
                      <span className="text-boost text-xs line-through">
                        {product.price.toLocaleString()}원
                      </span>
                      <span className="bg-brand/10 text-brand text-boost rounded-md px-1 py-0.5 text-xs font-bold">
                        {Math.round(
                          (1 - product.sale_price / product.price) * 100,
                        )}
                        %
                      </span>
                    </div>
                    <span className="text-foreground text-boost text-xl font-extrabold">
                      {product.sale_price.toLocaleString()}원
                    </span>
                  </div>
                ) : (
                  <span className="text-boost">
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

            {product.description ? (
              <div className="border-border border-t p-3 sm:p-5">
                <h2 className="text-boost font-bold">상세 내용</h2>
                <div className="text-boost mt-3 text-sm sm:text-base">
                  <RichText>{product.description}</RichText>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-w-0">
          <BookingFlow
            productId={product.id}
            month={month}
            availableDates={[...availableDates]}
            basePath={`/booking/${slug}`}
            minMonth={minMonth}
            maxMonth={maxMonth}
          />
        </div>
      </div>
    </main>
  );
}
