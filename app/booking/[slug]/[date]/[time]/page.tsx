import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadAvailableSlots } from "@/lib/availability/load";
import type { AvailabilitySettings } from "@/lib/availability/slots";
import { kstToday, diffDays } from "@/lib/time";
import { ReservationForm } from "@/components/reservation-form";

export const metadata: Metadata = { title: "신청 내용 작성" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export default async function ReservationPage({
  params,
}: PageProps<"/booking/[slug]/[date]/[time]">) {
  const { slug, date, time } = await params;

  if (!DATE_RE.test(date) || !TIME_RE.test(time)) notFound();

  const supabase = await createClient();
  const [{ data: product }, { data: settings }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, slug, duration_min, buffer_after_min")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle(),
    supabase
      .from("settings")
      .select(
        "slot_interval_min, min_lead_days, max_advance_days, bank_account, notice",
      )
      .eq("id", 1)
      .single(),
  ]);

  if (!product) notFound();

  // 과거이거나 너무 먼 날짜로 주소를 직접 조작해 들어온 경우.
  if (diffDays(kstToday(), date) < 0) notFound();

  const availabilitySettings: AvailabilitySettings | undefined = settings
    ? {
        slotIntervalMin: settings.slot_interval_min,
        minLeadDays: settings.min_lead_days,
        maxAdvanceDays: settings.max_advance_days,
      }
    : undefined;

  // 화면에 뜬 시간 목록은 몇 초 전 스냅샷일 수 있으니, 신청서를 보여주기
  // 직전에도 다시 확인한다 — 실제 최종 확인은 예약 신청 시
  // createReservation이 한 번 더 하지만, 여기서 미리 걸러야 이미 다른
  // 사람이 채간 시간에 신청서를 채우는 헛수고를 막을 수 있다.
  const slots = await loadAvailableSlots({
    date,
    productId: product.id,
    settings: availabilitySettings,
  });
  const stillAvailable = slots.some((slot) => slot.time === time);

  const [year, month, day] = date.split("-");
  const dateLabel = `${year}년 ${Number(month)}월 ${Number(day)}일`;
  const backHref = `/booking/${slug}?month=${year}-${month}`;

  if (!stillAvailable) {
    return (
      <main className="mx-auto w-full max-w-xl px-6 py-12">
        <Link href={backHref} className="text-muted text-sm hover:underline">
          ← 날짜·시간 다시 고르기
        </Link>
        <div className="border-border bg-surface mt-8 rounded-xl border p-6 text-center">
          <p className="text-muted">
            이 시간은 예약할 수 없게 됐어요. 이미 다른 분이 예약했거나, 예약
            가능한 시간이 아니에요.
          </p>
          <Link
            href={backHref}
            className="text-brand mt-3 inline-block text-sm hover:underline"
          >
            다른 시간 고르기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-12">
      <ReservationForm
        productId={product.id}
        productName={product.name}
        durationMin={product.duration_min}
        bufferAfterMin={product.buffer_after_min}
        date={date}
        time={time}
        dateLabel={dateLabel}
        backHref={backHref}
        bankAccount={settings?.bank_account ?? null}
        notice={settings?.notice ?? null}
      />
    </main>
  );
}
