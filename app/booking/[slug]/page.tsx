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
    <main className="min-h-screen bg-gradient-to-b from-white via-white to-gray-50/30">
      {/* 백그라운드 데코 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-20 right-0 w-96 h-96 bg-gray-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute bottom-40 left-20 w-72 h-72 bg-gray-100 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob animation-delay-2000" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        {/* 뒤로 버튼 */}
        <Link
          href="/booking"
          className="group inline-flex items-center gap-2 text-sm font-light text-gray-600 transition-all duration-300 hover:text-gray-900 mb-12"
        >
          <span className="transition-transform duration-300 group-hover:-translate-x-1">←</span>
          <span>상품 목록으로</span>
        </Link>

        {/* 메인 컨텐츠 - Editorial Split 레이아웃 */}
        <div className="grid grid-cols-1 gap-12 lg:gap-20 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          {/* 왼쪽: 이미지 + 상품 정보 */}
          <div className="space-y-8 order-2 lg:order-1">
            {/* 이미지 - Double-Bezel */}
            {product.cover_image ? (
              <div className="group/image">
                <div className="rounded-[2.5rem] bg-black/3 p-1.5 ring-1 ring-black/8 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/image:bg-black/5 group-hover/image:ring-black/12">
                  <div className="rounded-[calc(2.5rem-0.375rem)] overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={publicImageUrl(product.cover_image)}
                      alt={product.name}
                      className="aspect-video w-full object-cover transition-transform duration-700 ease-out group-hover/image:scale-105"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {/* 제목 + 메타 정보 */}
            <div className="space-y-6 border-b border-gray-200 pb-8">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                  예약 가능 서비스
                </p>
                <h1 className="text-5xl sm:text-6xl font-light leading-tight tracking-tight text-gray-900">
                  {product.name}
                </h1>
              </div>

              {/* 가격 · 시간 · 인원 */}
              <div className="flex flex-wrap items-baseline gap-6 text-lg">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-semibold text-gray-900">
                    {product.price.toLocaleString()}
                  </span>
                  <span className="text-gray-600">원</span>
                </div>
                {product.duration_min && (
                  <div className="text-gray-700 font-light">
                    <span className="font-semibold">{product.duration_min}</span>분
                  </div>
                )}
                {product.max_people && (
                  <div className="text-gray-700 font-light">
                    최대 <span className="font-semibold">{product.max_people}</span>명
                  </div>
                )}
              </div>
            </div>

            {/* 상세 설명 */}
            {product.description ? (
              <div className="prose prose-sm max-w-none">
                <div className="space-y-4 text-gray-700 leading-relaxed font-light text-base">
                  <RichText>{product.description}</RichText>
                </div>
              </div>
            ) : null}
          </div>

          {/* 오른쪽: 달력 + 시간 선택 */}
          <div className="order-1 lg:order-2">
            {/* 예약 가능 기간 안내 */}
            <div className="mb-6 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                예약 기간
              </p>
              <div className="inline-flex items-center gap-2 text-sm text-gray-700">
                <span className="font-medium">{earliestBookable}</span>
                <span className="text-gray-400">~</span>
                <span className="font-medium">{latestBookable}</span>
              </div>
            </div>

            {/* 달력 + 시간 선택 */}
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
      </div>

      {/* 글로벌 애니메이션 */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        @supports (animation-timeline: view()) {
          .prose-sm p {
            animation: fadeInUp 600ms ease-out forwards;
            opacity: 0;
          }
        }
      `}</style>
    </main>
  );
}
