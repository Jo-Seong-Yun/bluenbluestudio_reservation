import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadAvailableSlots } from "@/lib/availability/load";
import type { AvailabilitySettings } from "@/lib/availability/slots";
import { kstToday, diffDays, type DateString } from "@/lib/time";
import { ReservationForm } from "@/components/reservation-form";
import { loadActiveCustomFields } from "@/lib/booking/custom-fields";

export const metadata: Metadata = { title: "신청 내용 작성" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLOT_RE = /^(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})$/;

/**
 * `slots` 쿼리 파라미터("2026-09-12_10-00,2026-09-13_14-00")를 후보
 * 목록으로 푼다. 형식이 어긋난 조각은 조용히 버린다 — 주소를 직접
 * 조작해 들어온 경우까지 완벽하게 방어할 필요는 없고, 아래에서
 * "유효한 후보가 하나도 없으면" 안내 화면으로 보내면 충분하다.
 */
function parseSlotsParam(
  raw: string | undefined,
): { date: DateString; time: string }[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((chunk) => SLOT_RE.exec(chunk))
    .filter((match): match is RegExpExecArray => match !== null)
    .slice(0, 3)
    .map((match) => ({
      date: match[1] as DateString,
      time: `${match[2]}:${match[3]}`,
    }));
}

export default async function ApplyPage({
  params,
  searchParams,
}: PageProps<"/booking/[slug]/apply">) {
  const { slug } = await params;
  const { slots: slotsParam } = await searchParams;
  const requested = parseSlotsParam(
    Array.isArray(slotsParam) ? slotsParam[0] : slotsParam,
  );

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

  const customFields = await loadActiveCustomFields(product.id);
  const backHref = `/booking/${slug}`;

  // 과거이거나 형식이 이상한 날짜가 섞여 들어온 경우 걸러낸다.
  const inWindow = requested.filter(
    (c) => DATE_RE.test(c.date) && diffDays(kstToday(), c.date) >= 0,
  );

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
  // 사람이 확정한(또는 애초에 유효하지 않은) 시간에 신청서를 채우는
  // 헛수고를 막을 수 있다. 날짜별로 한 번만 조회한다.
  const uniqueDates = [...new Set(inWindow.map((c) => c.date))];
  const slotsByDate = new Map(
    await Promise.all(
      uniqueDates.map(
        async (date) =>
          [
            date,
            await loadAvailableSlots({
              date,
              productId: product.id,
              settings: availabilitySettings,
            }),
          ] as const,
      ),
    ),
  );

  const candidates = inWindow.filter((c) =>
    (slotsByDate.get(c.date) ?? []).some((slot) => slot.time === c.time),
  );

  if (candidates.length === 0) {
    return (
      <main className="mx-auto w-full max-w-xl px-6 py-12">
        <Link href={backHref} className="text-muted text-sm hover:underline">
          ← 날짜·시간 다시 고르기
        </Link>
        <div className="border-border bg-surface mt-8 rounded-xl border p-6 text-center">
          <p className="text-muted">
            고르신 시간을 더는 예약할 수 없게 되었습니다. 이미 다른 분이
            예약했거나, 예약 가능한 시간이 아닙니다.
          </p>
          <Link
            href={backHref}
            className="text-brand mt-3 inline-block text-sm hover:underline"
          >
            다시 고르기
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
        candidates={candidates}
        backHref={backHref}
        bankAccount={settings?.bank_account ?? null}
        notice={settings?.notice ?? null}
        customFields={customFields}
      />
    </main>
  );
}
