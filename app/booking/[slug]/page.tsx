import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadAvailableDates } from "@/lib/availability/load";
import type { AvailabilitySettings } from "@/lib/availability/slots";
import { Markdown } from "@/components/markdown";
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
  return { title: product?.name ?? "상품을 찾을 수 없어요" };
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
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <Link href="/booking" className="text-muted text-sm hover:underline">
        ← 상품 목록
      </Link>

      {/* 왼쪽엔 상품 설명, 오른쪽엔 달력·시간 선택. 좁은 화면에서는
          위아래로 쌓인다(설명을 먼저 읽고 예약 흐름으로 이어지도록). */}
      <div className="mt-6 flex flex-col gap-10 lg:flex-row lg:items-start">
        <div className="lg:w-[28rem] lg:shrink-0">
          {product.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={publicImageUrl(product.cover_image)}
              alt=""
              className="aspect-video w-full rounded-xl object-cover"
            />
          ) : null}

          <h1 className="mt-4 text-2xl font-bold">{product.name}</h1>
          <p className="text-muted mt-1">
            {product.duration_min}분 · {product.price.toLocaleString()}원
            {product.max_people ? ` · 최대 ${product.max_people}명` : ""}
          </p>

          {product.description ? (
            <div className="mt-6">
              <Markdown>{product.description}</Markdown>
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-muted text-xs">
            {earliestBookable} 부터 {latestBookable} 까지 예약할 수 있어요.
          </p>

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
