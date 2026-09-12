import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadAvailableDates } from "@/lib/availability/load";
import type { AvailabilitySettings } from "@/lib/availability/slots";
import { RichText } from "@/components/rich-text";
import { BookingFlow } from "@/components/booking-flow";
import { publicImageUrl } from "@/lib/images";
import { addDays, kstToday, monthGridDates } from "@/lib/time";

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
      : minMonth;

  const grid = monthGridDates(month);
  const availableDates = await loadAvailableDates({
    productId: product.id,
    from: grid[0],
    to: grid[grid.length - 1],
    settings: availabilitySettings,
  });

  return (
    <main className="mx-auto w-full max-w-[100rem] px-6 py-12">
      <Link href="/booking" className="text-muted text-sm hover:underline">
        ← 상품 목록
      </Link>

      {/* 제목과 예약 가능 기간은 그리드 바깥, 맨 위 한 줄에 같이 둔다 —
          왼쪽 칸(상품 설명 박스) 안에 제목을 넣으면 그 칸만 제목 높이만큼
          아래로 밀려, 오른쪽의 달력·시간 선택 박스와 상단이 안 맞는다.
          제목·기간 텍스트를 그리드보다 위에 두고 그리드 안에는 박스만
          남겨야, 세 박스(설명/달력/시간 선택)가 각자의 칸 맨 위에서
          시작해 상단이 그대로 맞는다. */}
      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <p className="text-muted text-xs">
          {earliestBookable} 부터 {latestBookable} 까지 예약할 수 있습니다.
        </p>
      </div>

      {/* 왼쪽엔 상품 설명, 오른쪽엔 달력·시간 선택. 좁은 화면에서는
          위아래로 쌓인다(설명을 먼저 읽고 예약 흐름으로 이어지도록).
          예약 흐름 쪽(BookingFlow)이 달력 + 그 옆 시간 선택 칸을
          나란히 두려면 꽤 넓은 폭이 필요해서, 상품 설명과 나란히
          두는 기준을 2xl(넓은 데스크톱)로 높여뒀다 — 그보다 좁으면
          예약 흐름에게 화면 전체 폭을 내줘야 달력이 찌그러지지 않는다.
          flex 대신 grid를 쓴다 — 왼쪽 칸을 28rem "고정 트랙"으로 못박아
          두면, 그 안의 글자가 아무리 길어도 트랙 자체가 늘어나는 일은
          없다(flex의 width는 min-content가 크면 그보다 더 넓어질 수
          있어 옆 칸(달력)을 침범할 수 있었다 — grid의 명시적 트랙
          크기는 그런 식으로 밀리지 않는다). min-w-0은 각 칸 내부
          콘텐츠가 트랙 폭 안에서 실제로 줄바꿈되도록 하는 안전장치로
          그대로 둔다. items-start라 어느 한쪽 박스가 더 높아져도 서로
          늘어나지 않고, 각자 자기 칸 맨 위에 그대로 붙어 있는다. */}
      <div className="mt-3 grid grid-cols-1 gap-10 2xl:grid-cols-[28rem_minmax(0,1fr)] 2xl:items-start">
        <div className="min-w-0">
          {product.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={publicImageUrl(product.cover_image)}
              alt=""
              className="mb-4 aspect-video w-full rounded-xl object-cover"
            />
          ) : null}

          <div className="border-border bg-surface rounded-xl border p-5">
            <p className="text-muted">
              {product.price.toLocaleString()}원
              {product.max_people ? ` · 최대 ${product.max_people}명` : ""}
            </p>

            {product.description ? (
              <div className="mt-6">
                <RichText>{product.description}</RichText>
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
