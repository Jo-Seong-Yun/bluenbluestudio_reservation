import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadAvailableSlots } from "@/lib/availability/load";
import { kstToday, diffDays } from "@/lib/time";
import { BookingForm } from "./booking-form";

export const metadata: Metadata = { title: "시간 선택" };

export default async function DateSlotsPage({
  params,
}: PageProps<"/booking/[slug]/[date]">) {
  const { slug, date } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const supabase = await createClient();
  const [{ data: product }, { data: settings }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, slug, price, duration_min, buffer_after_min")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle(),
    supabase
      .from("settings")
      .select("bank_account, notice")
      .eq("id", 1)
      .single(),
  ]);

  if (!product) notFound();

  // 과거이거나 너무 먼 날짜로 주소를 직접 조작해 들어온 경우.
  // 링크가 잘못 저장돼 있거나 시간이 지나 재방문한 경우 조용히 되돌린다.
  if (diffDays(kstToday(), date) < 0) notFound();

  const slots = await loadAvailableSlots({ date, productId: product.id });

  const [year, month, day] = date.split("-");

  return (
    <main className="mx-auto w-full max-w-lg px-6 py-12">
      <Link
        href={`/booking/${slug}?month=${year}-${month}`}
        className="text-muted text-sm hover:underline"
      >
        ← 날짜 다시 고르기
      </Link>

      <h1 className="mt-2 text-2xl font-bold">
        {year}년 {Number(month)}월 {Number(day)}일
      </h1>
      <p className="text-muted mt-1">{product.name}</p>

      {slots.length === 0 ? (
        <div className="border-border bg-surface mt-8 rounded-xl border p-6 text-center">
          <p className="text-muted">
            이 날짜는 예약이 모두 찼거나 예약할 수 없어요.
          </p>
          <Link
            href={`/booking/${slug}?month=${year}-${month}`}
            className="text-brand mt-3 inline-block text-sm hover:underline"
          >
            다른 날짜 고르기
          </Link>
        </div>
      ) : (
        <BookingForm
          productId={product.id}
          productName={product.name}
          durationMin={product.duration_min}
          bufferAfterMin={product.buffer_after_min}
          date={date}
          slots={slots.map((slot) => slot.time)}
          bankAccount={settings?.bank_account ?? null}
          notice={settings?.notice ?? null}
        />
      )}
    </main>
  );
}
